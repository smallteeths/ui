import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { get, set } from '@ember/object';

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
    const name = params.name ? `&username=${ params.name }` : '';
    const page = params.page || 1;

    return get(this, 'globalStore').rawRequest({
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/projects/${ params.project_id }/logs?page=${ page }&page_size=${ get(this, 'prefs.tablePerPage') }${ name ? name : '' }`
    }).then((resp) => {
      const data = resp;

      data.forEach((item) => {
        item.displayName = item.name;
      });

      return {
        data,
        totalCount: parseInt(resp.headers.map['x-total-count'] || 0),
        projectId:  params.project_id
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
    page:       { refreshModel: true },
    name:       { refreshModel: true },
  },
});
