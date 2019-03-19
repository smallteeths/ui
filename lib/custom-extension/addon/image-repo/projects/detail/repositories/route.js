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
    let imageList = null;
    let imageInformation = null;
    let harborServerArr = [];
    let harborServerIp = '';

    harborServerArr = get(this, 'harborServer').split('//');
    harborServerIp = harborServerArr.length ? harborServerArr[1] : '';
    imageInformation = get(this, 'harbor').getProjectDetail(params.project_id).then((resp) => {
      let tag = `docker tag SOURCE_IMAGE[:TAG] ${ harborServerIp }/${ resp.name }/IMAGE[:TAG]`;
      let push = `docker push ${ harborServerIp }/${ resp.name }/IMAGE[:TAG]`

      return {
        tag,
        push,
        name: resp.name
      };
    })

    imageList = get(this, 'globalStore').rawRequest({
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/') }/api/repositories?page=${ page }&page_size=${ get(this, 'prefs.tablePerPage') }&project_id=${ params.project_id }${ name ? name : '' }`
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
      imageList,
      imageInformation,
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