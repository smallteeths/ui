import { hash } from 'rsvp';
import { set, get } from '@ember/object'
import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default Route.extend({
  settings:   service(),
  nsResource: service(),
  scope:      service(),
  model(params) {
    const store = this.store;
    let projectSecrets = [];
    let namespacedSecrets = [];

    if (get(this, 'settings.enable-load-resource-by-namespace')) {
      const namespaces =  get(this, 'scope.currentProject.namespaces') || {};
      const namespaceId = params.namespaceId === undefined ? get(namespaces, 'firstObject.id') : params.namespaceId;

      projectSecrets =  namespaceId ? [] : this.nsResource.findAll('secret')
      namespacedSecrets = this.nsResource.findAll('namespacedSecret', namespaceId)
    } else {
      projectSecrets =   store.findAll('secret')
      namespacedSecrets = store.findAll('namespacedSecret')
    }

    const dependencies = {
      namespacedcertificates: store.findAll('namespacedcertificate'),
      certificates:           store.findAll('certificate'),
      projectSecrets,
      namespacedSecrets,
    };

    if (params.ingressId) {
      dependencies['existingIngress'] = store.find('ingress', params.ingressId);
    }

    return hash(dependencies).then((hash) => {
      let ingress;

      if (hash.existingIngress) {
        if (`${ params.upgrade  }` === 'true') {
          ingress = hash.existingIngress.clone();
          hash.existing = hash.existingIngress;
        } else {
          ingress = hash.existingIngress.cloneForNew();
        }
        delete hash.existingIngress;
      } else {
        ingress = store.createRecord({
          type:  'ingress',
          name:  '',
          rules: [],
          tls:   [],
        });
      }
      hash.ingress = ingress;

      hash.clientAuthSecert = this.getClientAuthSecert(hash);

      return hash;
    });
  },

  resetController(controller, isExisting) {
    if (isExisting) {
      set(controller, 'ingressId', null);
      set(controller, 'upgrade', null);
    }
  },

  actions: {
    cancel() {
      this.goToPrevious();
    },
  },

  getClientAuthSecert(hash){
    const proj = get(hash, 'projectSecrets').filterBy('type', 'secret');
    const ns = get(hash, 'namespacedSecrets').filterBy('type', 'namespacedSecret');
    const out = proj.concat(ns);

    return out.filter((item) => !!item?.data?.['ca.crt']);
  }
});
