import Route from '@ember/routing/route';
import { hash } from 'rsvp'
import { set, get } from '@ember/object';
import { on } from '@ember/object/evented';
import C from 'ui/utils/constants';
import { inject as service } from '@ember/service';

export default Route.extend({
  settings:     service(),
  nsResource:   service(),
  clusterStore: service(),
  scope:        service(),
  model(params) {
    if (get(this, 'settings.enable-load-resource-by-namespace')) {
      const namespaces =  get(this, 'scope.currentProject.namespaces');
      const namespaceId = params.namespaceId === undefined ? get(namespaces, 'firstObject.id') : params.namespaceId;

      return hash({
        namespaceId,
        namespaces:        this.clusterStore.findAll('namespace'),
        projectSecrets:    namespaceId ? [] : this.nsResource.findAll('secret'),
        namespacedSecrets: this.nsResource.findAll('namespacedSecret', namespaceId),
      });
    }

    const store = this.store;

    return hash({
      projectSecrets:    store.findAll('secret'),
      namespacedSecrets: store.findAll('namespacedSecret'),
    });
  },

  setDefaultRoute: on('activate', function() {
    set(this, `session.${ C.SESSION.PROJECT_ROUTE }`, 'authenticated.project.secrets');
  }),
  queryParams: { namespaceId: { refreshModel: true } },
});
