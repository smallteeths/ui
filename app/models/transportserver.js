import { get } from '@ember/object';
import Resource from '@rancher/ember-api-store/models/resource';
import { reference } from '@rancher/ember-api-store/utils/denormalize';
import { inject as service } from '@ember/service';

export default Resource.extend({
  clusterStore:  service(),
  router:        service(),

  type: 'transportserver',

  // canClone:      true,
  // canHaveLabels: true,

  namespace: reference('namespaceId', 'namespace', 'clusterStore'),

  actions:      {
    edit() {
      get(this, 'router').transitionTo('authenticated.project.f5.controllers.detail.edit', get(this, 'id'), { queryParams: { type: get(this, 'type') } });
    },
  },

});
