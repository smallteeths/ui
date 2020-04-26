import Controller from '@ember/controller';
import { get, set, observer, computed } from '@ember/object';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import Errors from 'ui/utils/errors';

const syncedHarborAccount = 'syncedAccount' // user is synced harbor account
const syncHarborAccount = 'syncAccount' // user need to sync harbor account
const changeHarborPwd = 'changeAccountPwd'// user will change pwd

export default Controller.extend({
  access:               service(),
  harbor:               service(),
  intl:                 service(),
  errors:               null,
  changeAccountErrors:  null,

  harborAccountErrors:     null,
  currentAccount:          null,
  changeHarborAccount:     false,
  changeHarborAccountForm: {},
  // isReSyncAccount:         false,
  requiredAuth:            false,
  harborAccountState:      alias('model.harborAccountState'),

  account:                 alias('model.account'),
  init() {
    this._super(...arguments);
  },
  actions:                 {
    reSyncAccount(cb) {
      set(this, 'requiredAuth', true)
      set(this, 'harborAccountState', syncHarborAccount);
      cb(true);
    },
    handleMenuClick(command) {
      this.send(command);
    },
    showChangeHarborAccountView() {
      const { email } = get(this, 'currentAccount');

      set(this, 'harborAccountState', changeHarborPwd);
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

      const { user_id } = get(this, 'currentAccount');

      if (!user_id) {
        set(this, 'harborAccountErrors', [intl.t('harborConfig.validate.errorAndResetHarbor')]);
        cb(false);

        return;
      }
      const { newPwd, oldPassword } = get(this, 'changeHarborAccountForm');
      const form = {};

      // if (new_email !== email) {
      //   form.email = new_email;
      // } else {
      //   form.email = '';
      // }
      form.newPassword = newPwd || '';
      form.oldPassword = oldPassword || '';
      if (Object.values(form).every((v) => v === '')) {
        set(this, 'harborAccountState', syncedHarborAccount);

        return;
      }
      const userId = get(this, 'access.me.id');

      get(this, 'harbor').updateHarborPwd(userId, form).then(() => {
        cb(true);
        // set(this, 'harborAccountState', syncedHarborAccount);
        location.reload();
      }).catch((err) => {
        cb(false);
        set(this, 'changeAccountErrors', [JSON.stringify(err.body)]);
      });
    },
    cancelChangeHarborAccount() {
      set(this, 'harborAccountState', syncedHarborAccount);
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

      const {
        username,
        email,
        password,
      } = get(this, 'account');
      const form = {}

      if (get(this, 'isLdapAuthMode')) {
        if (get(this, 'requiredAuth')) {
          form.username = username
          form.password = password
        }
      } else {
        if (get(this, 'requiredAuth')) {
          form.username = username
          form.password = password
          form.email = email
        } else {
          form.email = email
        }
      }

      get(this, 'harbor').syncHarborAccount(form).then(() => {
        set(this, 'errors', null);
        // set(this, 'harborAccountState', syncedHarborAccount);
        set(this, 'requiredAuth', false)
        cb(true);
        location.reload();
      }).catch((err) => {
        if (err && err.status === 410) {
          set(this, 'requiredAuth', true)
          const message = err && err.body && err.body.message

          if (message && message.indexOf('"code":401') !== -1) {
            set(this, 'errors', [this.intl.t('harborConfig.validate.pwdError')]);
          } else {
            set(this, 'errors', [Errors.stringify(err && err.body && err.body.message)]);
          }
        } else {
          set(this, 'errors', [this.intl.t('harborConfig.validate.accountUnavailable')]);
        }
        cb(false);
      });
    }
  },
  testHarborAccount: observer('hasHarborRegistry', 'harborAccountState', function() {
    const intl = get(this, 'intl');

    if (get(this, 'harborAccountState') === syncedHarborAccount && get(this, 'hasHarborRegistry')) {
      const url = get(this, 'model.harborServer');

      return get(this, 'harbor').testHarborAccount(url).then((resp) => {
        if (typeof resp.body === 'string') {
          const err = intl.t('harborConfig.validate.addressError');

          set(this, 'harborAccountErrors', [err]);
        } else {
          set(this, 'harborAccountErrors', null);
          set(this, 'currentAccount', resp.body);
        }
      }).catch((error) => {
        if (error.status === 410) {
          set(this, 'requiredAuth', true)
        }
        const err = intl.t('harborConfig.validate.accountUnavailable');

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
  // accountSynced: computed('access.me', 'isReSyncAccount', function() {
  //   const a = get(this, 'access.me.annotations');

  //   return !!(a && a['management.harbor.pandaria.io/synccomplete'] === 'true') && !get(this, 'isReSyncAccount');
  // }),
  hasHarborRegistry: computed('model.harborServer', function() {
    return !!get(this, 'model.harborServer');
  }),
  configActions: computed('hasHarborRegistry', 'harborAccountState', function() {
    if (get(this, 'hasHarborRegistry') && get(this, 'harborAccountState') === syncedHarborAccount  && !get(this, 'isLdapAuthMode')) {
      return [
        {
          label:  'imageRepoSection.action.changePwd',
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
  isLdapAuthMode: computed('model.harborSystemInfo', function() {
    return get(this, 'model.harborSystemInfo.auth_mode') === 'ldap_auth'
  }),
  validate() {
    const intl = get(this, 'intl');
    const emailReg = /^([A-Za-z0-9_\-\.\u4e00-\u9fa5])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,8})$/;
    const pReg = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!.*\s).{8,20}$/
    const { email, password } = get(this, 'account');
    const errors = [];

    if (get(this, 'isLdapAuthMode')) {
      if (get(this, 'requiredAuth')) {
        if (password === '') {
          errors.push(intl.t('harborConfig.validate.pwReq'));
        } else if (!pReg.test(password)){
          errors.push(intl.t('harborConfig.validate.formatError'))
        }
      }
    } else {
      if (get(this, 'requiredAuth')) {
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
      } else {
        if (email === '') {
          errors.push(intl.t('harborConfig.validate.emailReq'));
        } else if (!emailReg.test(email)){
          errors.push(intl.t('harborConfig.validate.emailUrlError'));
        }
      }
    }
    if (errors.length > 0) {
      set(this, 'errors', errors);

      return false;
    }

    return true;
  },
  validateChangeHarborAccount() {
    const intl = get(this, 'intl');
    // const emailReg = /^([A-Za-z0-9_\-\.\u4e00-\u9fa5])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,8})$/;
    const pReg = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!.*\s).{8,20}$/
    const {
      // email,
      newPwd,
      confirmPwd
    } = get(this, 'changeHarborAccountForm');
    const errors = [];

    // if (email === '') {
    //   errors.push(intl.t('harborConfig.validate.emailReq'));
    // } else if (!emailReg.test(email)) {
    //   errors.push(intl.t('harborConfig.validate.emailUrlError'));
    // }

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
