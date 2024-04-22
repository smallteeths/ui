import { hash } from 'rsvp';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';
import Ember from 'ember';

export default Route.extend({
  globalStore:         service(),
  scope:               service(),
  access:              service(),
  roleTemplateService: service('roleTemplate'),


  model(params) {
    const store = get(this, 'globalStore');
    // const cluster = this.modelFor('authenticated.cluster');

    // const project = store.createRecord({
    //   type:      'project',
    //   name:      '',
    //   clusterId: get(cluster, 'id'),
    // });

    const project = this.modelForNew(params);

    return hash({
      me:       get(this, 'access.principal'),
      project,
      projects: store.findAll('project'),
      roles:    get(this, 'roleTemplateService').get('allFilteredRoleTemplates'),
      users:    store.find('user', null, { forceReload: true }),
    });
  },

  resetController(controller, isExiting/* , transition*/) {
    if (isExiting) {
      set(controller, 'projectId', null);
    }
  },

  modelForNew(params) {
    const store = get(this, 'globalStore');
    const cluster = this.modelFor('authenticated.cluster');

    if (params.projectId) {
      return store.find('project', params.projectId).then((p) => {
        if (!p) {
          return Ember.RVP.reject('Project not found');
        }
        const newProject = p.cloneForNew();

        if (newProject.annotations) {
          Object.keys(newProject.annotations).filter((k) => k.startsWith('authz.management.cattle.io/') || k.startsWith('lifecycle.cattle.io/') || k.startsWith('field.cattle.io/'))
            .forEach((k) => {
              delete newProject.annotations[k];
            });
        }
        if (newProject.labels) {
          Object.keys(newProject.labels).filter((k) => k === 'cattle.io/creator' || k.startsWith('authz.management.cattle.io/'))
            .forEach((k) => {
              delete newProject.labels[k];
            });
        }

        return newProject;
      });
    }

    return store.createRecord({
      type:      'project',
      name:      '',
      clusterId: get(cluster, 'id'),
    });
  }
});
