import Controller from '@ember/controller';
import { get, set, observer, computed } from '@ember/object';
import { inject as service } from '@ember/service';
import { reject } from 'rsvp';
import Errors from 'ui/utils/errors';

const supportAccountSyncAuthModes = [
  {
    rancherAuthMode: 'keycloak_user',
    harborAuthMode:  'db_auth',
  },
  {
    rancherAuthMode: 'local',
    harborAuthMode:  'db_auth',
  },
  {
    rancherAuthMode: 'activedirectory_user_uid',
    harborAuthMode:  'db_auth',
  },
  {
    rancherAuthMode: 'activedirectory_user_uid',
    harborAuthMode:  'ldap_auth',
  },
  {
    rancherAuthMode: 'openldap_user_uid',
    harborAuthMode:  'db_auth',
  },
  {
    rancherAuthMode: 'openldap_user_uid',
    harborAuthMode:  'ldap_auth',
  },
];

function paseUrl(url) {
  const result = /^https?:\/\/([a-zA-Z0-9-.]+)/.exec(url);

  if (result && result.length === 2) {
    return result[1];
  }

  return '';
}

function extractConfig(config, prefixKeys) {
  const keys = Object.keys(config).filter((k) => prefixKeys.some((pk) => k.indexOf(pk) === 0));
  const form = {};

  keys.forEach((k) => {
    if (k === 'email_insecure') {
      form[k] = !config[k];
    } else {
      form[k] = config[k];
    }
  });

  return form;
}
export default Controller.extend({
  harbor:                  service(),
  harborV2:                service(),
  growl:                   service(),
  intl:                    service(),
  access:                  service(),
  harborService:           'harbor',
  harborAccountErrors:     null,
  harborConfigEditable:    true,
  harborConfig:            {},
  configurations:          {},
  rawConfigurations:       {},
  harborAccountValid:      false,
  emailConfigEditble:      true,
  systemConfigEditble:     true,
  emailServerConfigErrors: null,
  systemConfigErrors:      null,
  labelParam:              { scope: 'g' },
  changePwd:               false,
  changePwdForm:           {},
  currentAccount:          null,
  showConfirmDeleteModal:  false,
  savingHarborConfig:      false,
  harborVersion:           [{
    version: '',
    service: 'harbor',
  }, {
    version: 'v2.0',
    service: 'harborV2',
  }],
  actions:                 {
    handleMenuClick(command) {
      this.send(command);
    },
    showChangePwdView() {
      set(this, 'changePwd', true);
      set(this, 'harborConfigEditable', false);
      set(this, 'changePwdForm', {
        oldPwd:     '',
        newPwd:     '',
        confirmPwd: '',
      });
    },
    confirmChangePwd(cb) {
      const intl = get(this, 'intl');
      const ok = this.validateNewPwd();

      if (!ok) {
        cb(false);

        return;
      }
      const currentAccount = get(this, 'currentAccount');

      if (!currentAccount || !currentAccount.user_id) {
        set(this, 'harborAccountErrors', [intl.t('harborConfig.validate.errorAndResetHarbor')]);
        cb(false);

        return;
      }
      const userId = get(this, 'access.me.id');
      const { newPwd: newPassword, oldPwd: oldPassword } = get(this, 'changePwdForm');

      get(this, get(this, 'harborService')).updateHarborPwd(userId, {
        newPassword,
        oldPassword,
      }).then(() => {
        cb(true);
        set(this, 'changePwd', false);
        this.send('refreshModel');
      }).catch((err) => {
        const status = parseInt(err.status, 10);

        if ( 403 === status || 401 === status && 400 !== status ) {
          set(this, 'harborAccountErrors', [intl.t('harborConfig.validate.errorAndResetHarbor')]);
        } else if ( 400 === status ) {
          set(this, 'harborAccountErrors', [intl.t('harborConfig.validate.errorOldPwdSameAsNew')]);
        } else {
          set(this, 'harborAccountErrors', [Errors.stringify(err && err.body)]);
        }

        cb(false);
      });
    },
    cancelChangePwd() {
      set(this, 'changePwd', false);
      set(this, 'harborAccountErrors', null);
    },
    refresh() {
      this.send('refreshModel');
    },
    editHarborConfig() {
      set(this, 'harborConfigEditable', true);
    },
    saveHarborConfig(cb) {
      set(this, 'harborAccountErrors', null);
      const ok = this.validateHarborConfig();

      if (!ok) {
        cb(false);

        return;
      }
      this.addWhitelist().then(() => {
        const {
          url, username, password, version
        } = get(this, 'harborConfig');
        const harborVersion = get(this, 'harborVersion');
        const selected = harborVersion.find((harbor) => harbor.version === version);

        if (!selected){
          return reject(this.intl.t('harborConfig.validate.harborInfoVersionError'));
        }

        return get(this, selected.service).fetchConnectHarbor(url).then((harborInfo) => {
          return get(this, selected.service).saveHarborAccountWhenVersionOk(url, username, password, version, harborInfo).then((resp) => {
            set(this, 'model.harborSystemInfo', resp[resp.length - 1].harborSystemInfo);
          });
        }).catch((err) => {
          return this.testSelectHarborVersion(err, version, url);
        })
      }).then(() => {
        return this.testHarboAccount();
      }).then(() => {
        cb(true);
        this.send('refresh');
      })
        .catch((err) => {
          if (typeof err === 'string') {
            set(this, 'harborAccountErrors', [err])
          } else if ( err && err.status > 500) {
            set(this, 'harborAccountErrors', [this.intl.t('harborConfig.validate.unableAccess')]);
          } else {
            set(this, 'harborAccountErrors', [this.intl.t('harborConfig.validate.harborInfoError')]);
          }
          cb(false);
        });
    },
    cancelHarborConfig() {
      set(this, 'harborAccountErrors', null);
      this.modelChanged();
    },
    saveEmailConfig(cb) {
      const intl = get(this, 'intl');
      const ok = this.validateEmailServer();

      if (!ok) {
        cb(false);

        return;
      }
      const config = get(this, 'configurations');
      const form = extractConfig(config, ['email_']);

      get(this, get(this, 'harborService')).updateAdminConfig(form).then(() => {
        cb(true);
        get(this, 'growl').success(intl.t('harborConfig.validate.updateEmailServerOk'));
        this.refreshConfig();
      }).catch((err) => {
        cb(false);
        set(this, 'emailServerConfigErrors', [`${ intl.t('harborConfig.validate.updateEmailServerError') }: ${ err.body }`]);
        this.refreshConfig();
      });
    },
    cancelEmailConfig() {
      this.refreshConfig();
    },
    testEmailServer(cb) {
      const intl = get(this, 'intl');
      const ok = this.validateEmailServer();

      if (!ok) {
        cb(false);

        return;
      }

      const config = get(this, 'configurations');
      const form = extractConfig(config, ['email_']);

      get(this, get(this, 'harborService')).testEmailServer(form).then(() => {
        cb(true);
        get(this, 'growl').success(intl.t('harborConfig.validate.validateEmailServerOk'));
        this.refreshConfig();
      }).catch((err) => {
        cb(false);
        set(this, 'emailServerConfigErrors', [`${ intl.t('harborConfig.validate.updateEmailServerError') }: ${ err.body }`]);
        this.refreshConfig();
      });
    },
    saveSystemConfig(cb) {
      const intl = get(this, 'intl');
      const ok = this.validateSystemConfig();

      if (!ok) {
        cb(false);

        return;
      }
      const config = get(this, 'configurations');
      const configKeys = ['project_creation_restriction', 'token_expiration', 'read_only'];
      const form = {};

      configKeys.forEach((k) => {
        form[k] = config[k];
      });
      get(this, get(this, 'harborService')).updateAdminConfig(form).then(() => {
        cb(true);
        get(this, 'growl').success(intl.t('harborConfig.validate.updateSystemOk'));
        this.refreshConfig();
      }).catch((err) => {
        cb(false);
        set(this, 'emailServerConfigErrors', [`${ intl.t('harborConfig.validate.updateSystemError') }: ${ err.body }`]);
        this.refreshConfig();
      });
    },
    cancelSystemConfigy() {
      this.refreshConfig();
    },
    removeHarboConfig() {
      set(this, 'showConfirmDeleteModal', false)
      set(this, 'savingHarborConfig', true)
      get(this, get(this, 'harborService')).saveHarborAccount('', '', '', '').then(() => {
        this.send('refresh');
        set(this, 'savingHarborConfig', false)
      }).catch(() => {
        this.send('refresh');
        set(this, 'savingHarborConfig', false)
      });
    },
    promptDelete(){
      set(this, 'showConfirmDeleteModal', true)
    },
  },
  modelChanged: observer('model', function() {
    const {
      harborUser, harborVersion, harborServer
    } = get(this, 'model');

    if (harborUser && harborUser.name) {
      set(this, 'harborConfig', {
        url:      harborServer,
        version:  harborVersion.version,
        username: harborUser.name,
      });
      if (Object.keys(get(this, 'model.harborSystemInfo')).length === 0) {
        set(this, 'harborAccountErrors', [this.intl.t('harborConfig.validate.unableAccess')]);
      } else {
        this.testHarboAccount().then(() => {
          return this.refreshConfig();
        });
      }
      set(this, 'harborConfigEditable', false);
    } else {
      set(this, 'harborAccountValid', false)
      set(this, 'harborConfigEditable', true);
      set(this, 'harborConfig', {
        url:      '',
        username: '',
        password: '',
        version:  '',
      });
    }
  }),
  versionChanged: observer('harborConfig.version', function() {
    if (get(this, 'harborConfig.version') === 'v2.0'){
      set(this, 'harborService', 'harborV2')
    } else {
      set(this, 'harborService', 'harbor')
    }
  }),
  projectCreationOptions: computed('intl.locale', function() {
    const intl = get(this, 'intl');
    let arr = [
      {
        value: 'everyone',
        label:  intl.t('harborConfig.form.creator.all'),
      },
      {
        value: 'adminonly',
        label:  intl.t('harborConfig.form.creator.admin'),
      },
    ]

    return arr;
  }),
  isV2: computed('harborConfig.version', function() {
    return get(this, 'harborConfig.version') === 'v2.0';
  }),
  configActions: computed('changePwd', 'harborConfigEditable', 'harborAccountValid', 'isDBAuthMode', function() {
    if (!get(this, 'changePwd') && !get(this, 'harborConfigEditable')) {
      if (get(this, 'isDBAuthMode')) {
        return [
          {
            label:  'imageRepoSection.action.changePwd',
            icon:   'icon icon-edit',
            action: 'showChangePwdView'
          },
          {
            label:  'imageRepoSection.action.edit',
            icon:   'icon icon-edit',
            action: 'editHarborConfig'
          },
        ];
      }

      return [
        {
          label:  'imageRepoSection.action.edit',
          icon:   'icon icon-edit',
          action: 'editHarborConfig'
        },
      ];
    }

    return [];
  }),
  editAccount: computed('harborConfigEditable', function() {
    return get(this, 'harborConfigEditable');
  }),
  hasHarborServer: computed('model.harborServer', function() {
    return !!get(this, 'model.harborServer');
  }),
  showActionMenu: computed('configActions', function() {
    return get(this, 'configActions.length') !== 0;
  }),
  isDBAuthMode: computed('model.harborSystemInfo', function() {
    return get(this, 'model.harborSystemInfo.auth_mode') === 'db_auth'
  }),
  authMode: computed('model.harborSystemInfo.auth_mode', function() {
    const authMode = get(this, 'model.harborSystemInfo.auth_mode');

    if (!authMode) {
      return ''
    }

    return authMode.split('_')[0].toUpperCase();
  }),
  methodNotSupported: computed('model.harborSystemInfo', 'access.principal.id', 'model.harborUser.invalid', function() {
    if (get(this, 'model.harborUser.invalid')) {
      return false;
    }
    const rancherAuthMode = (get(this, 'access.principal.id') || '').split(':')[0];
    const authMode = get(this, 'model.harborSystemInfo.auth_mode');

    if (!authMode) {
      return false;
    }

    // if (!((['openldap_user_uid', 'activedirectory_user_uid'].indexOf(rancherAuthMode) !== -1 && ['db_auth', 'ldap_auth'].indexOf(authMode) !== -1) || authMode === 'db_auth')) {
    //   return true
    // }

    return !supportAccountSyncAuthModes.some((m) => m.rancherAuthMode === rancherAuthMode && m.harborAuthMode === authMode);
  }),
  rancherAuthMode: computed('access.principal.id', function() {
    return (get(this, 'access.principal.id') || '').split(':')[0].toUpperCase();
  }),
  refreshConfig() {
    return get(this, get(this, 'harborService')).fetchAdminConfig().then((resp) => {
      const rawConfig = resp;
      const config = {};

      Object.entries(rawConfig).forEach((e) => {
        if (e[0] === 'email_insecure') {
          config[e[0]] = !e[1].value;
        } else {
          config[e[0]] = e[1].value;
        }
      });
      set(this, 'configurations', config);
      set(this, 'rawConfigurations', rawConfig);
    });
  },
  validateEmailServer() {
    const intl = get(this, 'intl');
    const {
      email_host, email_port, email_from
    } = get(this, 'configurations');
    const errors = [];

    if (email_host === '') {
      errors.push(intl.t('harborConfig.validate.emailHostReq'));
    }
    if (email_port === '') {
      errors.push(intl.t('harborConfig.validate.emailPortReq'));
    }
    if (email_from === '') {
      errors.push(intl.t('harborConfig.validate.emailFromReq'));
    }

    if (!/^(\d)+$/g.test(email_port) || parseInt(email_port, 10) > 65535 || parseInt(email_port, 10) <= 0) {
      errors.push(intl.t('harborConfig.validate.emailPortFormatError'));
    }
    if (errors.length > 0) {
      set(this, 'emailServerConfigErrors', errors);

      return false;
    } else {
      set(this, 'emailServerConfigErrors', null);

      return true;
    }
  },
  validateHarborConfig() {
    const intl = get(this, 'intl')
    const urlReg = /^http(s)?:\/\/.+/i;
    const {
      url, username, password
    } = get(this, 'harborConfig');
    const errors = [];

    if (url === '') {
      errors.push(intl.t('harborConfig.validate.urlReq'));
    } else if (!urlReg.test(url)) {
      errors.push(intl.t('harborConfig.validate.urlFormatError'));
    }
    if (!username) {
      errors.push(intl.t('harborConfig.validate.usernameReq'));
    }
    if (!password) {
      errors.push(intl.t('harborConfig.validate.pwReq'));
    }
    if (errors.length > 0) {
      set(this, 'harborAccountErrors', errors);

      return false;
    }

    return true;
  },
  validateNewPwd() {
    const intl = get(this, 'intl');
    const pwdReg = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!.*\s).{8,20}$/;
    const { newPwd, oldPwd } = get(this, 'changePwdForm');
    const confirmPwd = get(this, 'changePwdForm.confirmPwd');
    const errors = [];

    if (newPwd !== confirmPwd) {
      errors.push(intl.t('harborConfig.validate.confirmError'));
    }
    if (!pwdReg.test(newPwd)) {
      errors.push(intl.t('harborConfig.validate.formatError'));
    }
    if (!pwdReg.test(oldPwd)) {
      errors.push(intl.t('harborConfig.validate.formatError'));
    }
    if (errors.length > 0) {
      set(this, 'harborAccountErrors', errors);

      return false;
    }

    return true;
  },
  addWhitelist() {
    const { url } =  get(this, 'harborConfig');

    return get(this, get(this, 'harborService')).addWhitelist(paseUrl(url))
  },
  testHarboAccount() {
    const { url } = get(this, 'harborConfig');
    const intl = get(this, 'intl');

    return get(this, get(this, 'harborService')).testHarborAccount(url).then((resp) => {
      if (resp.body.has_admin_role || resp.body.sysadmin_flag) {
        set(this, 'harborAccountValid', true);
        set(this, 'harborAccountErrors', null);
        set(this, 'currentAccount', resp.body);
      } else {
        let err = intl.t('harborConfig.validate.notAdmin');

        if (typeof resp.body === 'string') {
          err = intl.t('harborConfig.validate.addressError');
        }

        set(this, 'harborAccountValid', false);
        set(this, 'harborAccountErrors', [err]);

        return reject(err)
      }
    }).catch((err) => {
      set(this, 'harborAccountValid', false);
      if (typeof err === 'string') {
        set(this, 'harborAccountErrors', [err]);
      } else if ( err.status > 500) {
        set(this, 'harborAccountErrors', [intl.t('harborConfig.validate.unableAccess')]);
      } else {
        const { harborUser } = get(this, 'model');

        if (harborUser && harborUser.name && harborUser.invalid) {
          set(this, 'harborAccountErrors', [intl.t('harborConfig.validate.harborNeedUpdate')]);
        } else {
          set(this, 'harborAccountErrors', [intl.t('harborConfig.validate.harborInfoError')]);
        }
      }

      return reject(err)
    });
  },
  validateSystemConfig() {
    const intl = get(this, 'intl');
    const config = get(this, 'configurations');
    const expReg = /^[1-9]{1}[0-9]*$/;
    const exp = config && config['token_expiration']
    const errors = [];

    if (!expReg.test(exp)) {
      errors.push(intl.t('harborConfig.validate.numAndReq'));
    }

    if (errors.length > 0){
      set(this, 'systemConfigErrors', errors);

      return false;
    }

    return true;
  },
  testSelectHarborVersion(err, version, url){
    if (err.status !== 404) {
      return reject(err);
    }

    const harborVersion = get(this, 'harborVersion');
    const otherHarbors = harborVersion.filter((item) => item.version !== version)
    const otherHarborInfos = otherHarbors.map((item) => get(this, item.service).fetchConnectHarbor(url).catch((err) => err))

    return Promise.all(otherHarborInfos).then((data) => {
      const correctVersionInfo = data.find((item) => item.status === 200);

      if (!correctVersionInfo){
        return reject(err);
      } else {
        return reject(this.intl.t('harborConfig.validate.harborInfoVersionError'));
      }
    })
  }
});
