import { hash } from 'rsvp';
import { get } from '@ember/object';
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
      psps:     store.findAll('podSecurityPolicyTemplate'),
      roles:    get(this, 'roleTemplateService').get('allFilteredRoleTemplates'),
      users:    store.find('user', null, { forceReload: true }),
    });
  },

  modelForNew(params) {
    const store = get(this, 'globalStore');
    const cluster = this.modelFor('authenticated.cluster');

    if (params.projectId) {
      return store.find('project', params.projectId).then((p) => {
        if (!p) {
          return Ember.RVP.reject('Project not found');
        }

        return p.clone();
      });
    }

    return store.createRecord({
      type:      'project',
      name:      '',
      clusterId: get(cluster, 'id'),
    });
  }
});
