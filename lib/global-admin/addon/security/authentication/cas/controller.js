import { get, set, computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import Controller from '@ember/controller';
import C from 'ui/utils/constants';
import AuthMixin from 'global-admin/mixins/authentication';

export default Controller.extend(AuthMixin, {
  cas:           service(),
  endpoint:       service(),
  access:         service(),
  settings:       service(),
  globalStore:    service(),

  confirmDisable: false,
  errors:         null,
  testing:        false,
  error:          null,
  saved:          false,
  saving:         false,
  haveToken:      false,

  organizations:  null,
  isEnterprise:   false,
  secure:         true,

  protocolChoices: [
    {
      label: 'https:// -- Requires a cert from a public CA',
      value: 'https://'
    },
    {
      label: 'http://',
      value: 'http://'
    },
  ],

  authConfig:     alias('model.casConfig'),
  scheme:         alias('authConfig.scheme'),
  isEnabled:      alias('authConfig.enabled'),

  actions: {
    save() {
      this.send('clearError');

      if (!this.validate()) {
        return
      }

      set(this, 'saving', true);

      const authConfig   = get(this, 'authConfig');
      const am           = get(authConfig, 'accessMode') || 'restricted';

      authConfig.setProperties({
        port:                authConfig.get('port'),
        service:             this.redirectURI,
        connectionTimeout:   parseInt(authConfig.get('connectionTimeout'), 10),
        hostname:            authConfig.get('hostname'),
        loginEndpoint:       authConfig.get('loginEndpoint'),
        logoutEndpoint:      authConfig.get('logoutEndpoint'),
        enabled:             false, // It should already be, but just in case..
        accessMode:          am,
        tls:                 authConfig.get('tls'),
        allowedPrincipalIds: [],
      });

      get(this, 'cas').setProperties({
        scheme:  authConfig.get('scheme'),
        service: this.redirectURI
      });

      const gs = get(this, 'globalStore')

      gs.rawRequest({
        url:    `/v3/casConfigs/cas?action=configureTest`,
        method: 'POST',
        data:   {
          port:              authConfig.get('port'),
          service:           this.redirectURI,
          connectionTimeout: parseInt(authConfig.get('connectionTimeout'), 10),
          hostname:          authConfig.get('hostname'),
          loginEndpoint:     authConfig.get('loginEndpoint'),
          logoutEndpoint:    authConfig.get('logoutEndpoint'),
          tls:               authConfig.get('tls'),
        },
      }).then((res) => {
        const redirectUrl = res.body.redirectUrl

        this.gotRedirectUrl(redirectUrl)
      }).catch(() => {
        const errors = get(this, 'errors') || []

        errors.push('Obtained redirectUrl failed')
        set(this, 'errors', errors)
      })
    },
  },


  createDisabled: computed('authConfig.{clientId,clientSecret,hostname}', 'testing', 'isEnterprise', 'haveToken', function() {
    if (!get(this, 'haveToken')) {
      return true;
    }
    if ( get(this, 'isEnterprise') && !get(this, 'authConfig.hostname') ) {
      return true;
    }

    if ( get(this, 'testing') ) {
      return true;
    }
  }),

  providerName: computed('authConfig.hostname', function() {
    if ( get(this, 'authConfig.hostname') &&  get(this, 'authConfig.hostname') !== 'github.com') {
      return 'authPage.github.enterprise';
    } else {
      return 'authPage.github.standard';
    }
  }),

  numUsers: computed('authConfig.allowedPrincipals.@each.externalIdType', 'wasRestricted', function() {
    return ( get(this, 'authConfig.allowedPrincipalIds') || []).filter((principal) => principal.includes(C.PROJECT.TYPE_GITHUB_USER)).get('length');
  }),


  destinationUrl: computed(() => {
    return `${ window.location.origin }/`;
  }),

  redirectURI: computed(() => {
    return `${ window.location.origin }/verify-auth-cas`;
  }),

  validate() {
    const errors = get(this, 'errors') || []

    if (!get(this, 'authConfig.port')) {
      errors.push('Port is required')
    }
    // if (!get(this, 'authConfig.service')) {
    //   errors.push('Callback URL is required')
    // }
    if (!get(this, 'authConfig.connectionTimeout')) {
      errors.push('Connection Timeout is required')
    }
    if (!get(this, 'authConfig.hostname')) {
      errors.push('CAS Host is required')
    }
    set(this, 'errors', errors)

    return errors.length > 0 ? false : true
  },

  gotRedirectUrl(redirectUrl) {
    const authConfig   = get(this, 'authConfig');

    set(this, '_boundSucceed', this.authenticationApplied.bind(this));
    get(this, 'cas').test(authConfig, get(this, '_boundSucceed'), redirectUrl);
  },

  authenticationApplied(err) {
    set(this, 'saving', false);

    if (err) {
      set(this, 'isEnabled', false);
      this.send('gotError', err);

      return;
    }

    this.send('clearError');
  },
});
