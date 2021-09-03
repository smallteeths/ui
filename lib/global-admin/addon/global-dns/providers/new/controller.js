import Controller from '@ember/controller';
import { get, set, computed } from '@ember/object';
import { inject as service } from '@ember/service';
import ViewNewEdit from 'shared/mixins/view-new-edit';
import { alias } from '@ember/object/computed';

const DNS_PROVIDERS = ['route53', 'alidns', 'cloudflare', 'rdns', 'f5bigip'];

export default Controller.extend(ViewNewEdit, {
  router:             service(),
  globalStore:        service(),

  queryParams:        ['id', 'activeProvider'],
  memberAccessTypes:  ['owner', 'read-only'],
  id:                 null,
  errors:             [],

  activeProvider:          'route53',
  mode:                    'new',
  saveDisabled:            false,
  config:                  alias('model'),
  primaryResource:         alias('config'),

  actions: {
    switchProvider(provider) {
      set(this, 'activeProvider', provider);
    },

    cancel() {
      this.router.transitionTo('global-admin.global-dns.providers.index');
    },

    addAuthorizedPrincipal(principal) {
      if (principal) {
        let { members = [] } = this.model;

        if (!members) {
          members = [];
        }

        set(principal, 'accessType', 'owner');

        members.pushObject(this.globalStore.createRecord(principal));

        set(this, 'model.members', members);
      }
    },

    removeMember(member) {
      let { members } = this.model;

      members.removeObject(member);
    },

    addDeviceIP() {
      let devicesIPs = get(this, `config.${ this.activeProvider }ProviderConfig.f5BigipDeviceIPs`)

      devicesIPs.pushObject({
        name:        '',
        deviceName:  '',
        translation: '',
      })

      set(this, `config.${ this.activeProvider }ProviderConfig.f5BigipDeviceIPs`, devicesIPs);
    },

    removeDeciceIp(deviceIp) {
      let devicesIPs = get(this, `config.${ this.activeProvider }ProviderConfig.f5BigipDeviceIPs`)

      devicesIPs.removeObject(deviceIp);
    },
  },

  additionalOptions: computed('activeProvider', 'config.route53.additionalOptions', 'config.cloudflare.additionalOptions', 'config.alidns.additionalOptions', {
    get() {
      const { activeProvider, config } = this;
      const providerConfig = get(config, `${ activeProvider }ProviderConfig`);

      return get(providerConfig, 'additionalOptions') || {};
    },
    set(key, value) {
      set(this, `config.${ this.activeProvider }ProviderConfig.additionalOptions`, value);

      return value;
    },
  }),

  availableProviders: computed('activeProvider', 'isEdit', function() {
    if ( get(this, 'isEdit') ) {
      return [{ name: get(this, 'activeProvider') }];
    } else {
      return DNS_PROVIDERS.map( (p) => {
        return { name: p };
      });
    }
  }),

  isF5bigipProvider: computed('activeProvider', function() {
    return get(this, 'activeProvider') === 'f5bigip'
  }),

  validate() {
    const intl = get(this, 'intl');
    const providerConfig = get(this, `config.${ this.activeProvider }ProviderConfig`);
    const { mode }       = this;
    const errors = [];
    var ipv4 = /^((\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.){4}$/;
    var ipv6 = /^([\da-fA-F]{1,4}:){7}[\da-fA-F]{1,4}$/

    if (providerConfig && providerConfig.type === 'f5bigipProviderConfig') {
      if (providerConfig.f5BigipDeviceIPs && providerConfig.f5BigipDeviceIPs.length > 0) {
        let f5BigipDeviceIPs = providerConfig.f5BigipDeviceIPs
        let collectionDeviceIPS = []

        for (let i = 0; i < f5BigipDeviceIPs.length; i++) {
          if (f5BigipDeviceIPs[i].name !== '') {
            if (!ipv4.test(`${ f5BigipDeviceIPs[i].name }.`) && !ipv6.test(f5BigipDeviceIPs[i].name)) {
              errors.push(intl.t('globalDnsPage.providersPage.config.bigip.validation.deviceIPFormatError'));
              break
            }
          }
          if (f5BigipDeviceIPs[i].translation !== '') {
            if (!ipv4.test(`${ f5BigipDeviceIPs[i].translation }.`) && !ipv6.test(`${ f5BigipDeviceIPs[i].translation }:`)) {
              errors.push(intl.t('globalDnsPage.providersPage.config.bigip.validation.translationFormatError'));
              break
            }
          }
          if (f5BigipDeviceIPs[i].name === '' || f5BigipDeviceIPs[i].deviceName === '') {
            errors.push(intl.t('globalDnsPage.providersPage.config.bigip.validation.mustHasDeviceIP'));
            break
          }
          if (collectionDeviceIPS.every((item) => item !== f5BigipDeviceIPs[i].name)) {
            collectionDeviceIPS.push(f5BigipDeviceIPs[i].name)
          } else {
            errors.push(intl.t('globalDnsPage.providersPage.config.bigip.validation.deviceIPMustUnique'));
            break
          }
        }
      }
    }
    if (mode === 'edit' && providerConfig && providerConfig.hasOwnProperty('secretKey')) {
      if (providerConfig.secretKey === '' || providerConfig.secretKey === null) {
        delete providerConfig.secretKey;
      }
    }
    set(this, 'errors', errors);
    if (errors.length > 0) {
      return false;
    }

    return this._super(...arguments);
  },

  doneSaving() {
    this.send('cancel');
  },
});
