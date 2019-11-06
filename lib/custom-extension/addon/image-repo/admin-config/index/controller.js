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
  projectCreationOptions:  [
    {
      value: 'everyone',
      label:  '所有人',
    },
    {
      value: 'adminonly',
      label:  '仅管理员',
    },
  ],
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
      const ok = this.validateNewPwd();

      if (!ok) {
        cb(false);

        return;
      }
      const currentAccount = get(this, 'currentAccount');

      if (!currentAccount || !currentAccount.user_id) {
        set(this, 'harborAccountErrors', ['原始账号或密码错误, 无法修改密码，请重新配置Harbor账号.']);
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
          set(this, 'harborAccountErrors', ['原始账号或密码错误, 无法修改密码，请重新配置Harbor账号.']);
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
      const ok = this.validateEmailServer();

      if (!ok) {
        cb(false);

        return;
      }
      const config = get(this, 'configurations');
      const form = extractConfig(config, ['email_']);

      get(this, 'harbor').updateAdminConfig(form).then(() => {
        cb(true);
        get(this, 'growl').success('更新邮件服务器配置成功');
        this.refreshConfig();
      }).catch((err) => {
        cb(false);
        set(this, 'emailServerConfigErrors', [`更新邮件服务器配置失败, 错误: ${ err.body }`]);
        this.refreshConfig();
      });
    },
    cancelEmailConfig() {
      this.refreshConfig();
    },
    testEmailServer(cb) {
      const ok = this.validateEmailServer();

      if (!ok) {
        cb(false);

        return;
      }

      const config = get(this, 'configurations');
      const form = extractConfig(config, ['email_']);

      get(this, 'harbor').testEmailServer(form).then(() => {
        cb(true);
        get(this, 'growl').success('验证邮件服务器成功');
        this.refreshConfig();
      }).catch((err) => {
        cb(false);
        // get(this, 'growl').fromError('验证邮件服务器失败', err.body);
        set(this, 'emailServerConfigErrors', [`验证邮件服务器失败, 错误: ${ err.body }`]);
        this.refreshConfig();
      });
    },
    saveSystemConfig(cb) {
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
        get(this, 'growl').success('更新系统设置成功');
        this.refreshConfig();
      }).catch((err) => {
        cb(false);
        set(this, 'emailServerConfigErrors', [`更新系统设置失败, 错误: ${ err.body }`]);
        this.refreshConfig();
      });
    },
    cancelSystemConfigy() {
      this.refreshConfig();
    },
    removeHarboConfig(cb) {
      get(this, 'harbor').saveHarborAccount('', '', '').then(() => {
        cb(true);
        this.send('refresh');
      }).catch(() => {
        cb(true);
        this.send('refresh');
      });
    }
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
    const {
      email_host, email_port, email_from
    } = get(this, 'configurations');
    const errors = [];

    if (email_host === '') {
      errors.push('请输入邮件服务器地址');
    }
    if (email_port === '') {
      errors.push('请输入邮件服务器端口');
    }
    if (email_from === '') {
      errors.push('请输入邮件来源');
    }

    if (!/^(\d)+$/g.test(email_port) || parseInt(email_port, 10) > 65535 || parseInt(email_port, 10) <= 0) {
      errors.push('请输入正确的端口号');
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
    const urlReg = /^http(s)?:\/\/.+/i;
    const {
      url, username, password
    } = get(this, 'harborConfig');
    const errors = [];

    if (url === '') {
      errors.push('访问地址不能为空');
    } else if (!urlReg.test(url)) {
      errors.push('URL 地址格式错误，正确格式如：http(s)://example.com');
    }
    if (username === '') {
      errors.push('用户名不能为空');
    }
    if (password === '') {
      errors.push('密码不能为空');
    }
    if (errors.length > 0) {
      set(this, 'harborAccountErrors', errors);

      return false;
    }

    return true;
  },
  validateNewPwd() {
    const pwdReg = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!.*\s).{8,20}$/;
    const pwd = get(this, 'changePwdForm.newPwd');
    const confirmPwd = get(this, 'changePwdForm.confirmPwd');
    const errors = [];

    if (pwd !== confirmPwd) {
      errors.push('新密码和确认密码必须相同');
    }
    if (!pwdReg.test(pwd)) {
      errors.push(' 密码长度在8到20之间且需包含至少一个大写字符，一个小写字符和一个数字。');
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

    return get(this, 'harbor').testHarborAccount(url, username, password).then((resp) => {
      if (resp.body.has_admin_role) {
        set(this, 'harborAccountValid', true);
        set(this, 'harborAccountErrors', null);
        set(this, 'currentAccount', resp.body);
      } else {
        let err = '请使用管理员角色的用户配置Harbor';

        if (typeof resp.body === 'string') {
          err = '访问地址错误';
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
        set(this, 'harborAccountErrors', ['无法访问Harbor服务']);
      } else {
        set(this, 'harborAccountErrors', ['Harbor地址、用户名或密码错误']);
      }

      return reject(err)
    });
  },
  validateSystemConfig() {
    const config = get(this, 'configurations');
    const expReg = /^[1-9]{1}[0-9]*$/;
    const exp = config && config['token_expiration']
    const errors = [];

    if (!expReg.test(exp)) {
      errors.push('令牌过期时间必填，且为数字');
    }

    if (errors.length > 0){
      set(this, 'systemConfigErrors', errors);

      return false;
    }

    return true;
  },
});