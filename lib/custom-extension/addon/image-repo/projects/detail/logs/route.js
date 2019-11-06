import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { get, set } from '@ember/object';
import { hash } from 'rsvp';

export default Route.extend({
  harbor:       service(),
  access:       service(),
  globalStore:  service(),
  prefs:        service(),
  harborServer:       '',
  beforeModel() {
    this._super(...arguments);

    return get(this, 'harbor').loadHarborServerUrl().then((resp) => {
      set(this, 'harborServer', resp);
    });
  },
  model(params) {
    const page = params.page || 1;
    const pageSize = get(this, 'prefs.tablePerPage');

    const p = {
      page,
      page_size: pageSize
    }

    if (params.name) {
      p.username = params.name
    }
    const repo = get(this, 'harbor').getProjectDetail(params.project_id).then((resp) => {
      return { name: resp.body.name };
    });
    const currentUser = get(this, 'harbor').fetchCurrentHarborUser().then((resp) => resp.body);
    const logList = get(this, 'harbor').fetchProjectLogs( params.project_id, p ).then((resp) => {
      const data = resp.body;

      data.forEach((item) => {
        item.displayName = item.name;
      });

      return {
        data,
        totalCount:         parseInt(resp.headers.map['x-total-count'] || 0),
      };
    });

    return hash({
      repo,
      currentUser,
      logList,
      projectId:          params.project_id,
      currentUserRoleId: params.current_user_role_id
    });
  },
  actions: {
    refreshModel() {
      this.refresh();
    }
  },
  queryParams: {
    page:       { refreshModel: true },
    name:       { refreshModel: true },
  },
});
