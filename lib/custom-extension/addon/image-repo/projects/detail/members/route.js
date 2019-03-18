import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { get, set } from '@ember/object';

export default Route.extend({
  harbor:       service(),
  access:       service(),
  globalStore:  service(),
  prefs:        service(),
  refreshFlag:        true,
  harborServer:       '',
  beforeModel() {
    this._super(...arguments);

    return get(this, 'harbor').loadHarborServerUrl().then((resp) => {
      set(this, 'harborServer', resp);
    });
  },
  model(params) {
    const name = params.name ? `&entityname=${ params.name }` : '';
    const page = params.page || 1;
    const translateKeyVal = {
      u:            '用户',
      guest:        '访客',
      developer:    '开发人员',
      projectAdmin: '项目管理员'
    }

    return get(this, 'globalStore').request({
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/projects/${ params.project_id }/members?${ name ? name : '' }`
    }).then((resp) => {
      const data = resp;
      const currentPageData = [];
      const prefs = get(this, 'prefs.tablePerPage');

      data.forEach((item, i) => {
        item.entity_type = translateKeyVal[item.entity_type];
        item.role_name = translateKeyVal[item.role_name];
        item.displayName = item.entity_name;
        if ( i < page * prefs && i >= (page - 1) * prefs){
          currentPageData.push(item);
        }
      });

      return {
        data:        currentPageData,
        totalCount:  data.length || 0,
        projectId:   params.project_id,
        refreshFlag: get(this, 'refreshFlag')
      };
    });
  },
  redirect() {
    if (!get(this, 'access.admin')) {
      this.transitionTo('image-repo.projects.index');
    }
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
