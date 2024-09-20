import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';

export default Route.extend({
  globalStore:         service(),
  roleTemplateService: service('roleTemplate'),

  model(params) {
    const gs  = this.globalStore;
    const pid = this.paramsFor('authenticated.project');

    return hash({
      role:     gs.find('projectroletemplatebinding', params.role_id),
      roles:    gs.find('roletemplate', null, {
        filter: {
          hidden:  false,
          context: 'cluster'
        }
      }),
      roleBindings: gs.findAll('projectRoleTemplateBinding'),
      project:      gs.find('project', pid.project_id, { forceReload: true }),
    });
  },
});
