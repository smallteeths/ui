import Route from '@ember/routing/route';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';

export default Route.extend({
  harbor:       service(),
  access:       service(),
  globalStore:  service(),
  prefs:        service(),
  harborServer:       '',
  beforeModel() {
    this._super(...arguments);
    let harborServer = null;

    harborServer = get(this, 'harbor').loadHarborServerUrl().then((resp) => {
      set(this, 'harborServer', resp);
    });

    return hash({ harborServer });
  },
  model(params) {
    const repo = get(this, 'harbor').getProjectDetail(params.project_id).then((resp) => {
      return { name: resp.body.name };
    });
    const currentUser = get(this, 'harbor').fetchCurrentHarborUser().then((resp) => resp.body);
    const config = get(this, 'harbor').getProjectDetail(params.project_id).then((resp) => {
      let metaData = resp.body.metadata;

      return metaData;
    });

    return hash({
      repo,
      currentUser,
      config,
      projectId:            params.project_id,
      currentUserRoleId:    params.current_user_role_id
    });
  },
  actions: {
    refreshModel() {
      this.refresh();
    }
  },
});