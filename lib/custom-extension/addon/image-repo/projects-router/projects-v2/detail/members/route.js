import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { get, set } from '@ember/object';
import { hash } from 'rsvp';

export default Route.extend({
  harborV2:     service(),
  access:       service(),
  globalStore:  service(),
  prefs:        service(),
  refreshFlag:        true,
  harborServer:       '',
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
    const p = {};

    if (params.name) {
      p.entityname = params.name
    }

    const page = params.page || 1;
    const repo = get(this, 'harborV2').getProjectDetail(params.project_id).then((resp) => {
      return { name: resp.body.name };
    });
    const currentUser = get(this, 'harborV2').fetchCurrentHarborUser().then((resp) => resp.body);
    const harborVersion = get(this, 'harborV2').fetchSystemInfo();
    const memberList = get(this, 'harborV2').fetchProjectMembersList( params.project_id, p ).then((resp) => {
      const data = resp.body;
      const currentPageData = [];
      const prefs = get(this, 'prefs.tablePerPage');

      data.forEach((item, i) => {
        item.displayName = item.entity_name;
        if ( i < page * prefs && i >= (page - 1) * prefs){
          currentPageData.push(item);
        }
      });

      return {
        data:              currentPageData,
        totalCount:        data.length || 0,
      };
    });

    return hash({
      repo,
      currentUser,
      harborVersion,
      memberList,
      projectId:         params.project_id,
      refreshFlag:       get(this, 'refreshFlag'),
      currentUserRoleId: params.current_user_role_id
    });
  },
  actions: {
    refreshModel() {
      this.refresh();
    }
  },
  queryParams: {
    name: { refreshModel: true },
    page: { refreshModel: true },
  },
});
