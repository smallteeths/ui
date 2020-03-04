import Route from '@ember/routing/route';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';

export default Route.extend({
  harbor:       service(),
  harborServer: null,
  beforeModel() {
    this._super(...arguments);

    return get(this, 'harbor').loadHarborServerUrl().then((resp) => {
      set(this, 'harborServer', resp);
    });
  },
  model(params) {
    const repo = get(this, 'harbor').getProjectDetail(params.project_id).then((resp) => {
      return { name: resp.body.name };
    });
    const currentUser = get(this, 'harbor').fetchCurrentHarborUser().then((resp) => resp.body);
    const summary = get(this, 'harbor').fetchProjectSummary(params.project_id).then((resp) => resp.body);

    return hash({
      harborServer:      get(this, 'harborServer'),
      currentUserRoleId: params.current_user_role_id,
      projectId:         params.project_id,
      repo,
      currentUser,
      summary,
    });
  },
  actions: {
    refreshModel() {
      this.refresh();
    }
  },
  queryParams: { name: { refreshModel: true } },
});
