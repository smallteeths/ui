import Controller from '@ember/controller';
import { get, set, observer } from '@ember/object';
import { inject as service } from '@ember/service';
import Errors from 'ui/utils/errors';
import { reject } from 'rsvp';

function paseUrl(url) {
  const result = /^https?:\/\/([a-zA-Z0-9-.]+)/.exec(url);

  if (result && result.length === 2) {
    return result[1];
  }

  return '';
}

export default Controller.extend({
  harbor:                 service(),
  growl:                  service(),
  harborAccountErrors:   null,
  harborConfigEditable: true,
  harborConfig:         {},
  harborAccountValid:   false,
  headers:                [
    {
      name:           'name',
      label:          '项目名称',
      width:          100,
    },
    {
      name:            'metadata.public',
      label:           '访问级别',
    },
    {
      name:           'current_user_role_id',
      label:          '角色',
    },
    {
      name:           'repo_count',
      label:           '镜像仓库数',
    },
    {
      name:           'chartCount',
      label:          'Helm Chart 数目',
    },
    {
      name:           'creation_time',
      classNames:     'text-right pr-20',
      label:           '创建时间',
      width:          175,
    },
  ],
  availableActions: [
    {
      action:   'remove',
      icon:     'icon icon-trash',
      label:    'action.remove',
    },
  ],
  actions:     {
    refresh() {
      this.send('refreshModel');
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
        cb(true);
        this.send('refresh');
      }).catch(() => {
        cb(false);
      });
    },
    cancelHarborConfig() {
      set(this, 'harborAccountErrors', null);
      this.modelChanged();
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
      this.testHarboAccount();
    } else {
      set(this, 'harborConfig', {
        url:      '',
        username: '',
        password: '',
      });
    }
  }),
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
});