import Controller from '@ember/controller';
import { get, set, observer } from '@ember/object';
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
    refresh() {
      this.send('refreshModel');
    },
    editHarborConfig() {
      set(this, 'harborConfigEditable', true);
    },
    saveHarboConfig(cb) {
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
  refreshConfig() {
    return get(this, 'harbor').fetchAdminConfig().then((resp) => {
      const rawConfig = resp.body;
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

    if (!urlReg.test(url)) {
      errors.push('URL 地址格式错误，正确格式如： http://example.com');
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
  addWhitelist() {
    const { url } =  get(this, 'harborConfig');

    return get(this, 'harbor').addWhitelist(paseUrl(url))
  },
  testHarboAccount() {
    const {
      url, username, password
    } = get(this, 'harborConfig');

    return get(this, 'harbor').testHarborAccount(url, username, password).then(() => {
      set(this, 'harborAccountValid', true);
      set(this, 'harborAccountErrors', null);
    }).catch(() => {
      const err = 'Harbor 地址，用户名 或密码错误';

      set(this, 'harborAccountValid', false);
      set(this, 'harborAccountErrors', [err]);

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