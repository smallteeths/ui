import Route from '@ember/routing/route';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';

export default Route.extend({
  harborV2:     service(),
  access:       service(),
  globalStore:  service(),
  prefs:        service(),
  harborServer:       '',
  beforeModel() {
    this._super(...arguments);
    let harborServer = null;

    harborServer = get(this, 'harborV2').loadHarborServerUrl().then((resp) => {
      set(this, 'harborServer', resp);
    });

    return hash({ harborServer });
  },
  model(params) {
    const repo = get(this, 'harborV2').getProjectDetail(params.project_id).then((resp) => {
      return { name: resp.body.name };
    });
    const currentUser = get(this, 'harborV2').fetchCurrentHarborUser().then((resp) => resp.body);
    const harborVersion = get(this, 'harborV2').fetchSystemInfo();
    const config = get(this, 'harborV2').getProjectDetail(params.project_id).then((resp) => {
      let metaData = resp.body.metadata;

      return metaData;
    });

    return hash({
      repo,
      currentUser,
      harborVersion,
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

