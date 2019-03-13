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
    let harborServer = null;

    harborServer = get(this, 'harbor').loadHarborServerUrl().then((resp) => {
      set(this, 'harborServer', resp);
    });

    return hash({ harborServer });
  },
  model(params) {
    const name = params.name ? `&q=${ params.name }` : '';
    const page = params.page || 1;
    let mirrorList = null;
    let mirrorInformation = null;

    console.log(get(this, 'harborServer'));

    mirrorInformation = get(this, 'harbor').getProjectDetail(params.project_id).then((resp) => {
      let tag = `docker tag SOURCE_IMAGE[:TAG] ${ get(this, 'harborServer') }/${ resp.body.name }/IMAGE[:TAG]`;
      let push = `docker push ${ get(this, 'harborServer') }/${ resp.body.name }/IMAGE[:TAG]`

      return {
        tag,
        push,
        name: resp.body.name
      };
    })

    mirrorList = get(this, 'globalStore').rawRequest({
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/repositories?page=${ page }&page_size=${ get(this, 'prefs.tablePerPage') }&project_id=${ params.project_id }${ name ? name : '' }`
    }).then((resp) => {
      const data = resp.body;

      data.forEach((item) => {
        item.displayName = item.name;
      });

      return {
        data,
        totalCount: parseInt(resp.headers.map['x-total-count'] || 0),
        projectId:  params.project_id
      };
    });

    return hash({
      mirrorList,
      mirrorInformation,
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