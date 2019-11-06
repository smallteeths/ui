import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { get, set } from '@ember/object';
import { hash } from 'rsvp';

export default Route.extend({
  harbor:       service(),
  access:       service(),
  globalStore:  service(),
  prefs:        service(),
  refreshFlag:        true,
  harborServer:       '',
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
    const p = {};

    if (params.name) {
      p.entityname = params.name
    }

    const page = params.page || 1;
    const repo = get(this, 'harbor').getProjectDetail(params.project_id).then((resp) => {
      return { name: resp.body.name };
    });
    const currentUser = get(this, 'harbor').fetchCurrentHarborUser().then((resp) => resp.body);
    const memberList = get(this, 'harbor').fetchProjectMembersList( params.project_id, p ).then((resp) => {
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
