import Controller from '@ember/controller';
import { get, set, observer, computed } from '@ember/object';
import { inject as service } from '@ember/service';
import Errors from 'ui/utils/errors';

export default Controller.extend({
  access:               service(),
  harbor:               service(),
  errors:               null,
  changeAccountErrors:  null,
  accountEditable:      true,
  account:              {
    email:    '',
    password: '',
  },
  harborAccountValid:      false,
  harborAccountErrors:     null,
  currentAccount:          null,
  changeHarborAccount:     false,
  changeHarborAccountForm: {},
  isReSyncAccount:           false,
  actions:                 {
    reSyncAccount(cb) {
      set(this, 'isReSyncAccount', true);
      cb(true);
    },
    handleMenuClick(command) {
      this.send(command);
    },
    showChangeHarborAccountView() {
      const { email } = get(this, 'currentAccount');

      set(this, 'changeHarborAccount', true);
      set(this, 'changeHarborAccountForm', {
        email,
        newPwd:     '',
        confirmPwd: '',
      });
    },
    confirmChangeHarborAccount(cb) {
      const ok = this.validateChangeHarborAccount();

      if (!ok) {
        cb(false);

        return;
      }

      const { user_id, email } = get(this, 'currentAccount');

      if (!user_id) {
        set(this, 'harborAccountErrors', ['原始账号或密码错误, 无法修改密码，请重新配置Harbor账号.']);
        cb(false);

        return;
      }

      const account = get(this, 'access.me.annotations')['authz.management.cattle.io.cn/harborauth'];
      const [, old_password] = AWS.util.base64.decode(account).toString().split(':');

      const { newPwd, email: new_email } = get(this, 'changeHarborAccountForm');
      const form = {};

      if (new_email !== email) {
        form.email = new_email;
      } else {
        form.email = '';
      }
      if (newPwd !== '' && newPwd !== old_password) {
        form.newPassword = newPwd;
        form.oldPassword = old_password;
      } else {
        form.newPassword = '';
        form.oldPassword = '';
      }
      if (Object.values(form).every((v) => v === '')) {
        set(this, 'changeHarborAccount', false);

        return;
      }
      const userId = get(this, 'access.me.id');

      get(this, 'harbor').userChangeHarborAccount(userId, form).then(() => {
        cb(true);
        set(this, 'changeHarborAccount', false);
        location.reload();
      }).catch((err) => {
        cb(false);
        set(this, 'changeAccountErrors', [JSON.stringify(err.body)]);
      });
    },
    cancelChangeHarborAccount() {
      set(this, 'changeHarborAccount', false);
      this.send('refreshModel');
    },
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
        set(this, 'isReSyncAccount', false);
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
      const [username, password] = AWS.util.base64.decode(account).toString().split(':');

      return get(this, 'harbor').testHarborAccount(url, username, password).then((resp) => {
        if (typeof resp.body === 'string') {
          const err = '访问地址错误';

          set(this, 'harborAccountValid', false);
          set(this, 'harborAccountErrors', [err]);
        } else {
          set(this, 'harborAccountValid', true);
          set(this, 'harborAccountErrors', null);
          set(this, 'currentAccount', resp.body);
        }
      }).catch(() => {
        const err = 'Harbor 账号无法使用';

        set(this, 'harborAccountValid', false);

        set(this, 'harborAccountErrors', [err]);
      });
    }
  }),
  hasHarborAccountError: computed('harborAccountErrors', function() {
    const err = get(this, 'harborAccountErrors');

    if (!err) {
      return false;
    }

    return err.length > 0;
  }),
  accountSynced: computed('access.me', 'isReSyncAccount', function() {
    const a = get(this, 'access.me.annotations');

    return !!(a && a['authz.management.cattle.io.cn/harborauth']) && !get(this, 'isReSyncAccount');
  }),
  hasHarborRegistry: computed('model.harborServer', function() {
    return !!get(this, 'model.harborServer');
  }),
  configActions: computed('hasHarborRegistry', 'accountSynced', 'harborAccountValid', 'changeHarborAccount', function() {
    if (get(this, 'hasHarborRegistry') && get(this, 'accountSynced') && get(this, 'harborAccountValid') && !get(this, 'changeHarborAccount')) {
      return [
        {
          label:  'imageRepoSection.action.editAccount',
          icon:   'icon icon-edit',
          action: 'showChangeHarborAccountView'
        },
      ];
    }

    return [];
  }),
  showActionMenu: computed('configActions', function() {
    return get(this, 'configActions.length') !== 0;
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
  validateChangeHarborAccount() {
    const emailReg = /^([A-Za-z0-9_\-\.\u4e00-\u9fa5])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,8})$/;
    const pReg = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!.*\s).{8,20}$/
    const {
      email,
      newPwd,
      confirmPwd
    } = get(this, 'changeHarborAccountForm');
    const errors = [];

    if (email === '') {
      errors.push('请输入邮箱地址');
    } else if (!emailReg.test(email)) {
      errors.push('请使用正确的邮箱地址，例如: name@example.com');
    }

    if ((newPwd !== '' || confirmPwd !== '') && newPwd !== confirmPwd) {
      errors.push('新密码和确认密码不一致');
    }
    if ((newPwd !== '' && !pReg.test(newPwd)) || (confirmPwd !== '' && !pReg.test(confirmPwd))) {
      errors.push('密码长度在8到20之间且需包含至少一个大写字符，一个小写字符和一个数字');
    }

    if (errors.length > 0) {
      set(this, 'changeAccountErrors', errors);

      return false;
    }
    set(this, 'changeAccountErrors', null);

    return true;
  }
});
