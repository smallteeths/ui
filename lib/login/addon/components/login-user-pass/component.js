import { get, set, observer, setProperties } from '@ember/object';
import { next } from '@ember/runloop';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import C from 'ui/utils/constants';
import $ from 'jquery';

export default Component.extend({
  access:  service(),
  cookies: service(),
  intl:    service(),

  waiting:          null,
  username:         null,
  rememberUsername: false,
  password:         null,
  provider:         null,
  readableProvider: null,
  onlyLocal:        null,
  loginCooldown:    null,
  countdown:        null,
  cooldownTimer:    null,

  init() {
    this._super(...arguments);

    let username = null;

    if (get(this, 'provider') === 'local') {
      username = get(this, `cookies.${ C.COOKIE.USERNAME }`);
    } else {
      username = get(this, `cookies.${ get(this, 'provider').toUpperCase() }-USERNAME`);
    }

    if ( username ) {
      setProperties(this, {
        username,
        rememberUsername: true,
      });
    }

    if (get(this, 'provider') && !get(this, 'onlyLocal')) {
      let pv = null;

      switch (get(this, 'provider')) {
      case 'activedirectory':
        pv = get(this, 'intl').t('loginPage.readableProviders.ad');
        break;

      case 'openldap':
        pv = get(this, 'intl').t('loginPage.readableProviders.openldap');
        break;

      case 'freeipa':
        pv = get(this, 'intl').t('loginPage.readableProviders.freeipa');
        break;

      case 'azuread':
        pv = get(this, 'intl').t('loginPage.readableProviders.azureAd');
        break;

      case 'local':
      default:
        pv = get(this, 'intl').t('loginPage.readableProviders.local');
        break;
      }

      set(this, 'readableProvider', pv);

      // console.log(this.get('provider'));
    }
  },

  didInsertElement() {
    next(this, 'focusSomething');
  },
  willDestroyElement() {
    this.stopCountdown();
  },

  actions: {
    authenticate() {
      const username = get(this, 'username');
      let password   = get(this, 'password');
      const remember = get(this, 'rememberUsername');

      if (password && get(this, 'provider') === 'local') {
        password = password.trim();
      }

      const code = {
        username,
        password,
      };

      if ( remember ) {
        if (get(this, 'provider') === 'local') {
          get(this, 'cookies').setWithOptions(C.COOKIE.USERNAME, username, {
            expire: 365,
            secure: 'auto'
          });
        } else {
          get(this, 'cookies').setWithOptions(`${ get(this, 'provider').toUpperCase() }-USERNAME`, username, {
            expire: 365,
            secure: 'auto'
          });
        }
      } else {
        get(this, 'cookies').remove(C.COOKIE.USERNAME);
      }

      set(this, 'password', '');

      if ( get(this, 'access.providers') ) {
        if (this.action) {
          this.action(get(this, 'provider'), code);
        }
      }
    }
  },

  startCountdown: observer('loginCooldown', function() {
    set(this, 'countdown', get(this, 'loginCooldown') || 0);
    this.stopCountdown();
    const countdown = () => {
      const cooldownTime = parseInt(get(this, 'countdown'), 10);

      if (cooldownTime) {
        set(this, 'countdown', cooldownTime - 1);
      } else {
        this.stopCountdown();
      }
    };
    const timer = setInterval(countdown, 1000)

    set(this, 'cooldownTimer', timer);
  }),

  focusSomething() {
    if ( this.isDestroyed || this.isDestroying ) {
      return;
    }

    let elem = $('#login-username');

    if ( get(this, 'username') ) {
      elem = $('#login-password');
    }

    if ( elem && elem[0] ) {
      elem[0].focus();
    }
  },
  stopCountdown() {
    const timer = get(this, 'cooldownTimer');

    if (timer) {
      clearInterval(timer);
      set(this, 'cooldownTimer', null);
    }
  },
});
