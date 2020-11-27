import Component from '@ember/component';
import layout from './template';
import { get, set, observer, computed } from '@ember/object';
import Semver from 'semver';

const MIN_K8s_VERSION_FOR_IPVS = '1.11.0';

export default Component.extend({
  layout,
  rkeConfig: null,
  form:      {},
  editing:   true,

  clusterTemplateCreate:   null,
  applyClusterTemplate:    null,
  clusterTemplateRevision: null,
  questions:               null,
  addOverride:             null,

  init() {
    this._super(...arguments);
    const kubeProxyOption = get(this, 'rkeConfig.services.kubeproxy.extraArgs') || {};

    if (kubeProxyOption['proxy-mode'] === 'ipvs') {
      set(this, 'form', { 'proxy-mode': 'ipvs' });
    } else if (kubeProxyOption['proxy-mode'] === 'iptables' || kubeProxyOption['proxy-mode'] === undefined) {
      set(this, 'form', { 'proxy-mode': 'iptables' });
    }
  },

  kubernetesVersionDidChanged: observer('rkeConfig.kubernetesVersion', function() {
    if (!this.supportIpvsMode && this.form['proxy-mode'] === 'ipvs') {
      set(this, 'form.proxy-mode', 'iptables');
    }
  }),

  formDidChanged: observer('form.proxy-mode', function() {
    const option = Object.assign({}, this.form);

    this.setRKEProxyModeConfig(this.rkeConfig, 'services.kubeproxy.extraArgs', option);
  }),

  supportIpvsMode: computed('rkeConfig.kubernetesVersion', function() {
    const currentK8sVersion = (this.rkeConfig.kubernetesVersion || '').replace(/x/g, '0');

    try {
      return Semver.gte(currentK8sVersion, MIN_K8s_VERSION_FOR_IPVS);
    } catch (err) {
      console.warn(err);
    }

    return false;
  }),

  setRKEProxyModeConfig(config, keyPath, value) {
    const keys = keyPath.split('.');

    keys.reduce((t, c, index) => {
      let obj = t[c];

      if (index === keys.length - 1) {
        if (!obj) {
          t[c] = value;

          return value;
        }
        Object.assign(obj, value);

        return obj;
      }

      if (!obj) {
        obj = {};
        t[c] = obj;
      }

      return obj;
    }, config);
  }
});