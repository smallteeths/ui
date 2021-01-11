import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { get, set } from '@ember/object';
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
    const page = params.page || 1;
    const pageSize = get(this, 'prefs.tablePerPage');
    const harborServerArr = get(this, 'harborServer').split('//');
    const harborServerIp = (harborServerArr.length ? harborServerArr[1] : '').replace(/\/+$/, '');
    const repo = get(this, 'harborV2').getProjectDetail(params.project_id).then((resp) => {
      let tag = `docker tag SOURCE_IMAGE[:TAG] ${ harborServerIp }/${ resp.body.name }/IMAGE[:TAG]`;
      let push = `docker push ${ harborServerIp }/${ resp.body.name }/IMAGE[:TAG]`

      return {
        tag,
        push,
        name: resp.body.name
      };
    });

    const p = {
      project_id: params.project_id,
      q:          {},
    };

    p.q = {
      page,
      page_size: pageSize,
    }

    if (params.name) {
      p.q.name = params.name
    }

    const currentUser = get(this, 'harborV2').fetchCurrentHarborUser().then((resp) => resp.body);
    const harborVersion = get(this, 'harborV2').fetchSystemInfo();

    return hash({
      repo,
      currentUser,
      harborVersion,
      currentUserRoleId: params.current_user_role_id,
    }).then((hash) => {
      p.name = hash.repo.name

      return get(this, 'harborV2').fetchProjectImages(p).then((resp) => {
        const data = resp.body;

        data.forEach((item) => {
          item.displayName = item.name;
        });

        return {
          imageList: {
            data,
            totalCount: parseInt(resp.headers.map['x-total-count'] || 0),
            projectId:  params.project_id
          },
          repo:              hash.repo,
          currentUser:       hash.currentUser,
          harborVersion:     hash.harborVersion,
          currentUserRoleId: hash.currentUserRoleId,
        };
      });
    })
  },
  resetController(controller) {
    controller.set('page', 1);
    controller.set('name', '');
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

