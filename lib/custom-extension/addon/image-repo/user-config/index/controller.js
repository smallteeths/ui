import Controller from '@ember/controller';
import { get, set, observer, computed } from '@ember/object';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import Errors from 'ui/utils/errors';

export default Controller.extend({
  access:               service(),
  harbor:               service(),
  intl:                 service(),
  errors:               null,
  changeAccountErrors:  null,
  accountEditable:      true,

  harborAccountValid:      false,
  harborAccountErrors:     null,
  currentAccount:          null,
  changeHarborAccount:     false,
  changeHarborAccountForm: {},
  isReSyncAccount:           false,
  account:                 alias('model.account'),

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
      const intl = get(this, 'intl');
      const ok = this.validateChangeHarborAccount();

      if (!ok) {
        cb(false);

        return;
      }

      const { user_id, email } = get(this, 'currentAccount');

      if (!user_id) {
        set(this, 'harborAccountErrors', [intl.t('harborConfig.validate.errorAndResetHarbor')]);
        cb(false);

        return;
      }
      const a = get(this, 'access.me.annotations') || {};
      const account = a['authz.management.cattle.io.cn/harborauth'] || '';
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
    const intl = get(this, 'intl');

    if (get(this, 'accountSynced') && get(this, 'hasHarborRegistry')) {
      const url = get(this, 'model.harborServer');
      const a = get(this, 'access.me.annotations') || {};
      const account = a['authz.management.cattle.io.cn/harborauth'] || '';
      const [username, password] = AWS.util.base64.decode(account).toString().split(':');

      return get(this, 'harbor').testHarborAccount(url, username, password).then((resp) => {
        if (typeof resp.body === 'string') {
          const err = intl.t('harborConfig.validate.addressError');

          set(this, 'harborAccountValid', false);
          set(this, 'harborAccountErrors', [err]);
        } else {
          set(this, 'harborAccountValid', true);
          set(this, 'harborAccountErrors', null);
          set(this, 'currentAccount', resp.body);
        }
      }).catch(() => {
        const err = intl.t('harborConfig.validate.accountUnavailable');

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
    const intl = get(this, 'intl');
    const emailReg = /^([A-Za-z0-9_\-\.\u4e00-\u9fa5])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,8})$/;
    const pReg = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!.*\s).{8,20}$/
    const { email, password } = get(this, 'account');
    const errors = [];

    if (email === '') {
      errors.push(intl.t('harborConfig.validate.emailReq'));
    } else if (!emailReg.test(email)){
      errors.push(intl.t('harborConfig.validate.emailUrlError'));
    }
    if (password === '') {
      errors.push(intl.t('harborConfig.validate.pwReq'));
    } else if (!pReg.test(password)){
      errors.push(intl.t('harborConfig.validate.formatError'))
    }
    if (errors.length > 0) {
      set(this, 'errors', errors);

      return false;
    }

    return true;
  },
  validateChangeHarborAccount() {
    const intl = get(this, 'intl');
    const emailReg = /^([A-Za-z0-9_\-\.\u4e00-\u9fa5])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,8})$/;
    const pReg = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!.*\s).{8,20}$/
    const {
      email,
      newPwd,
      confirmPwd
    } = get(this, 'changeHarborAccountForm');
    const errors = [];

    if (email === '') {
      errors.push(intl.t('harborConfig.validate.emailReq'));
    } else if (!emailReg.test(email)) {
      errors.push(intl.t('harborConfig.validate.emailUrlError'));
    }

    if ((newPwd !== '' || confirmPwd !== '') && newPwd !== confirmPwd) {
      errors.push(intl.t('harborConfig.validate.confirmError'));
    }
    if ((newPwd !== '' && !pReg.test(newPwd)) || (confirmPwd !== '' && !pReg.test(confirmPwd))) {
      errors.push(intl.t('harborConfig.validate.formatError'));
    }

    if (errors.length > 0) {
      set(this, 'changeAccountErrors', errors);

      return false;
    }
    set(this, 'changeAccountErrors', null);

    return true;
  }
});
