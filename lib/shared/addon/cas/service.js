import Service, { inject as service } from '@ember/service';
import Util from 'shared/utils/util';
import { get, set } from '@ember/object';
import C from 'shared/utils/constants';

export default Service.extend({
  access:      service(),
  cookies:     service(),
  session:     service(),
  globalStore: service(),
  app:         service(),
  intl:        service(),

  generateState() {
    return set(this, 'session.githubState', `${ Math.random() }`);
  },

  stateMatches(actual) {
    return actual && get(this, 'session.githubState') === actual;
  },

  testConfig(config) {
    return config.doAction('configureTest', config);
  },

  saveConfig(config, opt) {
    return config.doAction('testAndApply', opt);
  },

  authorize(auth, state) {
    const url = Util.addQueryParams(get(auth, 'redirectUrl'), {
      scope:        'read:org',
      redirect_uri: `${ window.location.origin }/verify-auth`,
      authProvider: 'github',
      state,
    });

    return window.location.href = url;
  },

  login() {
    const provider     = get(this, 'access.providers').findBy('id', 'cas');
    const authRedirect = get(provider, 'redirectUrl');

    window.location.href = authRedirect
  },

  test(config, cb, redirectUrl) {
    let responded = false;

    console.log(redirectUrl, 'redirectUrl')
    window.onAuthTest = (err, ticket) => {
      if ( !responded ) {
        let ghConfig = config;

        responded = true;

        this.finishTest(ghConfig, ticket, cb);
      }
    };
    let url = redirectUrl
    // let url = `${ config.tls ? 'https' : 'http' }://${ config.hostname }:${ config.port }${ config.loginEndpoint.startsWith('/') ? config.loginEndpoint : `/${ config.loginEndpoint }` }?service=${ encodeURIComponent(`${ window.location.origin }/verify-auth-cas`) }`

    const popup = window.open(url, 'rancherAuth', Util.popupWindowOptions());
    const intl = get(this, 'intl');

    let timer = setInterval(() => {
      if (popup && popup.closed ) {
        clearInterval(timer);

        if ( !responded ) {
          responded = true;
          cb({
            type:    'error',
            message: intl.t('authPage.cas.testAuth.authError')
          });
        }
      } else if (popup === null || typeof (popup) === 'undefined') {
        clearInterval(timer);

        if ( !responded ) {
          responded = true;

          cb({
            type:    'error',
            message: intl.t('authPage.cas.testAuth.popupError')
          });
        }
      }
    }, 500);
  },

  finishTest(config, ticket, cb) {
    const ghConfig = config;

    set(ghConfig, 'enabled', true);
    // set(ghConfig, 'hostname', `saic.saicmotor.com`);
    let out = {
      ticket,
      enabled:      true,
      casConfig:    ghConfig,
      description:  C.SESSION.DESCRIPTION,
      ttl:          C.SESSION.TTL,
    };

    const allowedPrincipalIds = get(config, 'allowedPrincipalIds') || [];

    return this.saveConfig(config, out).then(() => {
      let found = false;
      const myPIds = get(this, 'access.me.principalIds');

      myPIds.forEach( (id) => {
        if (allowedPrincipalIds.indexOf(id) >= 0) {
          found = true;
        }
      });

      if ( !found && !allowedPrincipalIds.length) {
        allowedPrincipalIds.pushObject(get(this, 'access.principal.id'));
      }

      return ghConfig.save().then(() => {
        window.location.href = window.location.href;
      });
    })
      .catch((err) => {
        cb(err);
      });
  },
});
