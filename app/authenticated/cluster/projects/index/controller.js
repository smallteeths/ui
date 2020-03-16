import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { computed, get } from '@ember/object';

export default Controller.extend({
  scope:       service(),
  access:      service(),
  queryParams: { group: 'group', },
  group:       'project',

  actions: {
    changeView() {

    },
  },

  rows: computed('model.namespaces.@each.state', 'model.namespaces.@each.displayName', 'model.projects.@each.clusterId', 'scope.currentCluster.id', function() {
    if (this.hideRemovingNs) {
      return get(this, 'model.namespaces')
        .filterBy('displayName')
        .filter((ns) => ns.state !== 'removing');
    }

    return get(this, 'model.namespaces')
      .filterBy('displayName');
  }),

  projects: computed('model.namespaces.@each.displayName', 'model.projects.@each.clusterId', 'scope.currentCluster.id', function() {
    return get(this, 'model.projects').filterBy('clusterId', get(this, 'scope.currentCluster.id'));
  }),

  projectsWithoutNamespaces: computed('projects.@each.{id,state,clusterId}', 'rows.@each.projectId', function(){
    return get(this, 'projects').filter((p) => {
      const namespaces = get(this, 'rows').filterBy('projectId', get(p, 'id')) || [];

      return get(namespaces, 'length') <= 0;
    })
      .sortBy('displayName');
  }),

  hideRemovingNs: computed('access.me.hasAdmin', 'access.me.clusterRoleBindings.@each.roleTemplateId', function() {
    if (get(this, 'access.me.hasAdmin') || (get(this, 'access.me.clusterRoleBindings') || []).some((rb) => rb.roleTemplateId === 'cluster-owner')) {
      return false;
    }

    return true;
  }),

});
