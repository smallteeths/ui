import { get, set, observer } from '@ember/object'
import Component from '@ember/component';
import layout from './template';

export default Component.extend({
  layout,

  editing: null,
  hosts:   null,

  certHost:        null,
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
      get(this, 'certHost').removeObject(host);
    },
  },

  hostDidChange: observer('hostArray.@each.value', 'certHost.firstObject.value', function() {
    const hosts = [];
    const certHost = get(this, 'certHost.firstObject');

    certHost && certHost.value && hosts.push(certHost.value);
    get(this, 'hostArray').filter((host) => host.value).forEach((host) => {
      hosts.push(host.value);
    });

    set(this, 'hosts', hosts)
  }),

  certChanged: observer('cert.certificateId', function() {
    const hostArray = get(this, 'hostArray')
    const certificateId = get(this, 'cert.certificateId');

    if (certificateId) {
      const allCertificates = get(this, 'allCertificates');

      const currentCert = allCertificates.findBy('id', certificateId)

      if (currentCert.cn && !hostArray.find((item) => item.value === currentCert.cn)){
        set(this, 'certHost', [{ value: currentCert.cn, }])
      } else {
        set(this, 'certHost', [])
      }
    } else {
      const certHost = get(this, 'certHost');

      certHost && certHost.removeObject(certHost.firstObject);
    }
  }),
  initHosts() {
    const hosts = get(this, 'hosts') || [];

    set(this, 'hostArray', hosts.map((host) => {
      return { value: host, };
    }));
  },

});
