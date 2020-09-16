import Route from '@ember/routing/route';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';

export default Route.extend({
  harborV2:     service(),
  access:       service(),
  harborServer: null,
  beforeModel() {
    this._super(...arguments);
    // if (!get(this, 'access.me.hasAdmin')) {
    //   this.transitionTo('image-repo.projects.index');

    //   return;
    // }

    return get(this, 'harborV2').loadHarborServerUrl().then((resp) => {
      set(this, 'harborServer', resp);
    });
  },
  model(params) {
    const repo = get(this, 'harborV2').getProjectDetail(params.project_id).then((resp) => {
      return { name: resp.body.name };
    });
    const project = get(this, 'harborV2').fetchProject(params.project_id).then((resp) => resp);
    const currentUser = get(this, 'harborV2').fetchCurrentHarborUser().then((resp) => resp.body);
    const harborVersion = get(this, 'harborV2').fetchSystemInfo();

    return hash({
      repo,
      currentUser,
      harborVersion,
      project,
      projectId:         params.project_id,
      currentUserRoleId: params.current_user_role_id
    });
  },
});
