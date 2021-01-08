import Component from '@ember/component';
import layout from './template';
import {
  get, observer, computed, set, setProperties
} from '@ember/object';
import { inject as service } from '@ember/service';
import C from 'shared/utils/constants';

const CUSTOM = 'custom';

export default Component.extend({
  intl:            service(),
  settings:        service(),
  layout,
  tagName:         '',
  mode:            'default',
  cert:            null,
  allCertificates: null,
  editing:         null,

  init() {
    this._super(...arguments);

    const found = (get(this, 'allCertificates') || []).findBy('id', get(this, 'cert.certificateId'));

    if ( found ) {
      set(this, 'mode', CUSTOM);
    }
  },

  modeChanged: observer('mode', function() {
    let certificateId = null;
    const mode = get(this, 'mode');

    if ( mode === CUSTOM) {
      certificateId = get(this, 'allCertificates.firstObject.id');
    }
    const cert = get(this, 'cert');

    setProperties(cert, {
      certificateId,
      mode
    });
  }),

  rules: computed('ingress.{defaultBackend,rules}', function() {
    let rules = [];

    (get(this, 'ingress.rules') || []).forEach((rule) => {
      rules.push(rule);
    });
    const defaultBackend = get(this, 'ingress.defaultBackend');

    if (defaultBackend) {
      rules.push({
        defaultBackend: true,
        paths:          [defaultBackend]
      });
    }

    return rules;
  }),

  matchCertInfo: computed('allCertificates', 'cert.certificateId', 'intl.locale', 'mode', 'rules.@each.host', function() {
    const mode = get(this, 'mode');
    const intl = get(this, 'intl');

    if ( mode === CUSTOM) {
      const certificateId = get(this, 'cert.certificateId') || '';
      const allCertificates = get(this, 'allCertificates');
      const currentCert = allCertificates.findBy('id', certificateId);
      const ruleHosts = get(this, 'rules');
      const certHost = currentCert.cn;
      const sans = currentCert.displaySans || [];

      if (!this.matchCert(certHost, ruleHosts) && !sans.some((certHost) => this.matchCert(certHost, ruleHosts))){
        return intl.t('formSslTermination.certNotMatch')
      } else {
        return ''
      }
    }

    return ''
  }),

  matchCert(certHost, ruleHosts){
    return ruleHosts.some((rule) => {
      const ruleHost = rule.host || '';
      const ruleHostArray = ruleHost.split('.');
      const certHostArray = certHost.split('.');
      const xip = get(this, `settings.${ C.SETTING.INGRESS_IP_DOMAIN }`);

      if (ruleHost === xip){
        return true;
      }
      if ( ruleHost && certHost === ruleHost){
        return true;
      }
      if (certHostArray[0] !== '*' || ruleHostArray[0] === '*'){
        return false
      }
      if (ruleHostArray.length === certHostArray.length){
        const length = ruleHostArray.length

        return JSON.stringify(ruleHostArray.slice(1, length)) === JSON.stringify(certHostArray.slice(1, length))
      } else {
        return false
      }
    })
  },
});
