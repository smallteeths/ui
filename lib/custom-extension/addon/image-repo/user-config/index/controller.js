import Controller from '@ember/controller';
import { get, set, observer, computed } from '@ember/object';
import { inject as service } from '@ember/service';
import Errors from 'ui/utils/errors';

export default Controller.extend({
  access:               service(),
  harbor:               service(),
  errors:               null,
  accountEditable:      true,
  account:              {
    email:    '',
    password: '',
  },
  harborAccountValid:  true,
  harborAccountErrors: null,
  actions:             {
    refresh() {
      this.send('refreshModel');
    },
    syncAccount(cb) {
      if (!this.validate()) {
        cb(false);

        return;
      }

      const { email, password } = get(this, 'account');

      get(this, 'harbor').syncHarborAccount(email, password).then(() => {
        set(this, 'errors', null);
        cb(true);
        location.reload();
      }).catch((err) => {
        set(this, 'errors', [Errors.stringify(err && err.body && err.body.message)]);
        cb(false);
      });
    }
  },
  testHarboAccount: observer('model.harborServer', 'accountSynced', function() {
    if (get(this, 'accountSynced') && get(this, 'hasHarborRegistry')) {
      const url = get(this, 'model.harborServer');
      const account = get(this, 'access.me.annotations')['authz.management.cattle.io.cn/harborauth'];
      const [username, password] = atob(account).split(':');

      return get(this, 'harbor').testHarborAccount(url, username, password).then(() => {
        set(this, 'harborAccountValid', true);
        set(this, 'harborAccountErrors', null);
      }).catch(() => {
        const err = 'Harbor 账号无法使用';

        set(this, 'harborAccountValid', false);

        set(this, 'harborAccountErrors', [err]);
      });
    }
  }),
  accountSynced:   computed('access.me', function() {
    const a = get(this, 'access.me.annotations');

    return !!(a && a['authz.management.cattle.io.cn/harborauth']);
  }),
  hasHarborRegistry: computed('model.harborServer', function() {
    return !!get(this, 'model.harborServer');
  }),
  validate() {
    const emailReg = /^([A-Za-z0-9_\-\.\u4e00-\u9fa5])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,8})$/;
    const pReg = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!.*\s).{8,20}$/
    const { email, password } = get(this, 'account');
    const errors = [];

    if (email === '') {
      errors.push('请输入邮箱地址');
    } else if (!emailReg.test(email)){
      errors.push('请使用正确的邮箱地址，例如: name@example.com');
    }
    if (password === '') {
      errors.push('请输入密码');
    } else if (!pReg.test(password)){
      errors.push('密码长度在8到20之间且需包含至少一个大写字符，一个小写字符和一个数字')
    }
    if (errors.length > 0) {
      set(this, 'errors', errors);

      return false;
    }

    return true;
  },
});
