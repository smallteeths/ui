import { get } from '@ember/object';
import Resource from '@rancher/ember-api-store/models/resource';
import { reference } from '@rancher/ember-api-store/utils/denormalize';
import { inject as service } from '@ember/service';

export default Resource.extend({
  clusterStore:  service(),
  router:        service(),
  intl:          service(),

  type: 'tlsprofile',

  namespace: reference('namespaceId', 'namespace', 'clusterStore'),

  actions:      {
    edit() {
      get(this, 'router').transitionTo('authenticated.project.f5.tls.detail.edit', get(this, 'id') );
    },
  },

  validationErrors() {
    const intl = get(this, 'intl');
    let errors = this._super(...arguments);
    const hosts = get(this, 'hosts');
    const client = get(this, 'tls.clientSSL');
    const server = get(this, 'tls.serverSSL');
    const termination = get(this, 'tls.termination');

    if (hosts.length === 0) {
      errors.push(intl.t('validation.required', { key: intl.t('generic.domainName') }));
    }

    if (termination !== 'passthrough' && (!client || client.trim() === '') ) {
      errors.push(intl.t('validation.required', { key: intl.t('f5TLSPage.form.clientSSL.label') }));
    }

    if (termination === 'reencrypt' && (!server || server.trim() === '') ) {
      errors.push(intl.t('validation.required', { key: intl.t('f5TLSPage.form.serverSSL.label') }));
    }

    return errors;
  }

});
