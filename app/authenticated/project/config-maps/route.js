import Route from '@ember/routing/route';
import { hash } from 'rsvp'
import { set, get } from '@ember/object';
import { on } from '@ember/object/evented';
import C from 'ui/utils/constants';
import { inject as service } from '@ember/service';

export default Route.extend({
  settings:     service(),
  nsResource:   service(),
  scope:        service(),
  clusterStore: service(),
  model(params) {
    if (get(this, 'settings.enable-load-resource-by-namespace')) {
      const namespaces =  get(this, 'scope.currentProject.namespaces');
      const namespaceId = params.namespaceId === undefined ? get(namespaces, 'firstObject.id') : params.namespaceId;

      return hash({
        namespaceId,
        namespaces: this.clusterStore.findAll('namespace'),
        configMaps: this.nsResource.findAll('configMap', namespaceId)
      });
    }
    const store = this.store;

    return hash({ configMaps: store.findAll('configMap'), });
  },

  setDefaultRoute: on('activate', function() {
    set(this, `session.${ C.SESSION.PROJECT_ROUTE }`, 'authenticated.project.config-maps');
  }),
  queryParams: { namespaceId: { refreshModel: true } },
});
