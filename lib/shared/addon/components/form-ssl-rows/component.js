import { get, set, observer } from '@ember/object'
import Component from '@ember/component';
import layout from './template';

export default Component.extend({
  layout,

  editing: null,
  hosts:   null,

  certHosts:       [],
  cert:            null,
  allCertificates: null,

  hostArray: null,

  init() {
    this._super(...arguments);
    this.initHosts();
  },

  didInsertElement() {
    if (get(this, 'editing') && get(this, 'hostArray.length') === 0) {
      this.send('addHost');
    }
  },

  actions: {
    removeHost(host) {
      get(this, 'hostArray').removeObject(host);
    },

    addHost() {
      get(this, 'hostArray').pushObject({ value: '', });
    },

    removeCertHost(host) {
      get(this, 'certHosts').removeObject(host);
    },
  },

  hostDidChange: observer('hostArray.@each.value', 'certHosts.@each.value', function() {
    const hosts = [];

    get(this, 'certHosts').filter((host) => host.value).forEach((host) => {
      hosts.push(host.value);
    });
    get(this, 'hostArray').filter((host) => host.value).forEach((host) => {
      hosts.push(host.value);
    });

    set(this, 'hosts', hosts)
  }),

  certChanged: observer('cert.certificateId', function() {
    const hostArray = get(this, 'hostArray')
    const certificateId = get(this, 'cert.certificateId');
    const allCertificates = get(this, 'allCertificates');
    const currentCert = allCertificates.findBy('id', certificateId);
    const sans = currentCert.displaySans || [];
    let certHosts = [];

    if (!certificateId || !currentCert.cn) {
      set(this, 'certHosts', []);

      return;
    }

    if (sans.length){
      certHosts = sans.filter((san) => !hostArray.find((item) => san === item.value)).map((item) => ({ value: item })) || [];
    }
    if (!hostArray.find((item) => item.value === currentCert.cn)){
      certHosts.unshift({ value: currentCert.cn });
    }
    if (hostArray && hostArray.length && hostArray.firstObject.value === ''){
      hostArray.removeObject(hostArray.firstObject);
    }
    set(this, 'certHosts', certHosts);
  }),
  initHosts() {
    const hosts = get(this, 'hosts') || [];

    set(this, 'hostArray', hosts.map((host) => {
      return { value: host, };
    }));
  },

});
