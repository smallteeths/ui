import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { get } from '@ember/object';
import { hash } from 'rsvp';

export default Route.extend({
  globalStore:         service(),
  roleTemplateService: service('roleTemplate'),

  model(params) {
    const gs  = get(this, 'globalStore');
    const cid = this.paramsFor('authenticated.cluster');

    return hash({
      role:     gs.find('clusterroletemplatebinding', params.role_id),
      roles:    gs.find('roletemplate', null, {
        filter: {
          hidden:  false,
          context: 'cluster'
        }
      }),
      roleBindings: gs.findAll('clusterRoleTemplateBinding'),
      cluster:      gs.find('cluster', cid.cluster_id, { forceReload: true }),
    });
  },
});
