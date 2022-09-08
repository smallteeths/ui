import Component from '@ember/component';
import layout from './template';
import { inject as service } from '@ember/service';
import { get, computed } from '@ember/object';
import C from 'ui/utils/constants';

export default Component.extend( {
  intl:     service(),
  settings: service(),

  layout,
  password:            '',
  setPasswordStrength: null,

  passwordMinLength: computed(`settings.${ C.SETTING.CATTLE_PASSWORD_MIN_LENGTH }`, function() {
    const len = parseInt(get(this, `settings.${ C.SETTING.CATTLE_PASSWORD_MIN_LENGTH }`), 10) || 12;

    return len;
  }),

  passwordStrengthValue: computed('password', 'setPasswordStrength', 'passwordMinLength', function() {
    let modes = 0;
    let password = get(this, 'password') ? get(this, 'password') : ''

    if (password.length < 1) {
      if (this.setPasswordStrength) {
        this.setPasswordStrength(modes);
      }

      return modes;
    }
    if (password.length < this.passwordMinLength && password.length > 1) {
      if (this.setPasswordStrength) {
        this.setPasswordStrength(modes);
      }

      return 'weak';
    }
    (/\d/.test(password)) && modes++;
    (/[a-z]/.test(password)) && modes++;
    (/[A-Z]/.test(password)) && modes++;
    (/\W/.test(password)) && modes++;

    if (this.setPasswordStrength) {
      this.setPasswordStrength(modes);
    }

    switch (modes) {
    case 1:
      return 'weak';
    case 2:
      return 'good';
    case 3:
    case 4:
      return 'best';
    }

    return modes;
  }),

  passwordStrengthClass: computed('passwordStrengthValue', function() {
    switch (get(this, 'passwordStrengthValue')) {
    case 'weak':
      return 'password-meter-weak';
    case 'good':
      return 'password-meter-good';
    case 'best':
      return 'password-meter-best';
    }

    return 'password-meter-null'
  }),

  passwordStrengthText: computed('passwordStrengthValue', 'intl.locale', function() {
    const intl = get(this, 'intl');

    switch (get(this, 'passwordStrengthValue')) {
    case 'weak':
      return intl.t('modalEditPassword.strength.weak');
    case 'good':
      return intl.t('modalEditPassword.strength.good');
    case 'best':
      return intl.t('modalEditPassword.strength.best');
    }

    return ''
  }),

  passwordStrengthTooltip: computed('password', 'passwordStrengthValue', 'passwordMinLength', function() {
    const intl = get(this, 'intl');
    let password = get(this, 'password') ? get(this, 'password') : ''

    if (get(this, 'passwordStrengthValue') === 'weak' && password.length >= this.passwordMinLength) {
      return intl.t('modalEditPassword.strength.tooltip2');
    } else if ( password.length < this.passwordMinLength && password.length > 0) {
      return intl.t('modalEditPassword.strength.tooltip1', { length: this.passwordMinLength });
    }

    return ''
  }),
});
