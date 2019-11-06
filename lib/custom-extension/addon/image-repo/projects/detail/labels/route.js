import Route from '@ember/routing/route';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';

export default Route.extend({
  harbor:       service(),
  access:       service(),
  harborServer: null,
  beforeModel() {
    this._super(...arguments);
    // if (!get(this, 'access.currentUser.hasAdmin')) {
    //   this.transitionTo('image-repo.projects.index');

    //   return;
    // }

    return get(this, 'harbor').loadHarborServerUrl().then((resp) => {
      set(this, 'harborServer', resp);
    });
  },
  model(params) {
    const repo = get(this, 'harbor').getProjectDetail(params.project_id).then((resp) => {
      return { name: resp.body.name };
    });
    const project = get(this, 'harbor').fetchProject(params.project_id).then((resp) => resp);
    const currentUser = get(this, 'harbor').fetchCurrentHarborUser().then((resp) => resp.body);

    return hash({
      repo,
      currentUser,
      project,
      projectId:         params.project_id,
      currentUserRoleId: params.current_user_role_id
    });
  },
});
