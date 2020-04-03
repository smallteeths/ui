import Controller from '@ember/controller';
import { get, set, observer, computed } from '@ember/object';
import { inject as service } from '@ember/service';
import { reject } from 'rsvp';


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
  growl:                   service(),
  intl:                    service(),
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
  savingHarborConfig:       false,
  actions:                 {
    handleMenuClick(command) {
      this.send(command);
    },
    showChangePwdView() {
      set(this, 'changePwd', true);
      set(this, 'harborConfigEditable', false);
      set(this, 'changePwdForm', {
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
      const { user_id } = currentAccount;
      const new_password = get(this, 'changePwdForm.newPwd');
      const old_password = get(this, 'harborConfig.password');

      get(this, 'harbor').changPwd(user_id, {
        new_password,
        old_password
      }).then(() => {
        get(this, 'harbor').saveAdminAuth(get(this, 'harborConfig.username'), new_password).then(() => {
          cb(true);
          set(this, 'changePwd', false);
          this.send('refreshModel');
        }).catch((err) => {
          cb(false);
          set(this, 'harborAccountErrors', [err.body]);
        });
      }).catch((err) => {
        const status = parseInt(err.status, 10);

        if (401 === status) {
          set(this, 'harborAccountErrors', [intl.t('harborConfig.validate.errorAndResetHarbor')]);
        } else {
          set(this, 'harborAccountErrors', [err.body]);
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
    saveHarboConfig(cb) {
      set(this, 'harborAccountErrors', null);
      const ok = this.validateHarborConfig();

      if (!ok) {
        cb(false);

        return;
      }
      this.addWhitelist().then(() => {
        return this.testHarboAccount();
      }).then(() => {
        const {
          url, username, password
        } = get(this, 'harborConfig');

        return get(this, 'harbor').saveHarborAccount(url, username, password);
      }).then(() => {
        cb(true);
        this.send('refresh');
      })
        .catch(() => {
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

      get(this, 'harbor').updateAdminConfig(form).then(() => {
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

      get(this, 'harbor').testEmailServer(form).then(() => {
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
      get(this, 'harbor').updateAdminConfig(form).then(() => {
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
      get(this, 'harbor').saveHarborAccount('', '', '').then(() => {
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
    const { harborUser, harborServer } = get(this, 'model');

    if (harborUser) {
      const [username, password] = harborUser.split(':')

      set(this, 'harborConfig', {
        url:      harborServer,
        username,
        password,
      });
      this.testHarboAccount().then(() => {
        return this.refreshConfig();
      });
      set(this, 'harborConfigEditable', false);
    } else {
      set(this, 'harborAccountValid', false)
      set(this, 'harborConfigEditable', true);
      set(this, 'harborConfig', {
        url:      '',
        username: '',
        password: '',
      });
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
  configActions: computed('changePwd', 'harborConfigEditable', 'harborAccountValid', function() {
    if (!get(this, 'changePwd') && !get(this, 'harborConfigEditable')) {
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
    if (get(this, 'harborAccountValid') && !get(this, 'changePwd') && !get(this, 'harborConfigEditable')) {
      return [
        {
          label:  'imageRepoSection.action.changePwd',
          icon:   'icon icon-edit',
          action: 'showChangePwdView'
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
  refreshConfig() {
    return get(this, 'harbor').fetchAdminConfig().then((resp) => {
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
    if (username === '') {
      errors.push(intl.t('harborConfig.validate.usernameReq'));
    }
    if (password === '') {
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
    const pwd = get(this, 'changePwdForm.newPwd');
    const confirmPwd = get(this, 'changePwdForm.confirmPwd');
    const errors = [];

    if (pwd !== confirmPwd) {
      errors.push(intl.t('harborConfig.validate.confirmError'));
    }
    if (!pwdReg.test(pwd)) {
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

    return get(this, 'harbor').addWhitelist(paseUrl(url))
  },
  testHarboAccount() {
    const {
      url, username, password
    } = get(this, 'harborConfig');
    const intl = get(this, 'intl');

    return get(this, 'harbor').testHarborAccount(url, username, password).then((resp) => {
      if (resp.body.has_admin_role) {
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
        set(this, 'harborAccountErrors', [intl.t('harborConfig.validate.harborInfoError')]);
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
});
