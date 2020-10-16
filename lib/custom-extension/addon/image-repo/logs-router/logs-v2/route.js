import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { get, set } from '@ember/object';

export default Route.extend({
  harborV2:     service(),
  access:       service(),
  globalStore:  service(),
  prefs:        service(),
  harborServer:       '',
  beforeModel() {
    this._super(...arguments);

    return get(this, 'harborV2').loadHarborServerUrl().then((resp) => {
      set(this, 'harborServer', resp);
    });
  },
  model(params) {
    const page = params.page || 1;
    const pageSize = get(this, 'prefs.tablePerPage');
    const p = {
      page,
      page_size: pageSize,
    };

    if (params.keyName && params.keyValue) {
      p[params.keyName] = params.keyValue
    }
    if (get(this, 'harborServer')) {
      return get(this, 'harborV2').fetchLogs(p).then((resp) => {
        const data = resp.body;

        return {
          harborServer:      get(this, 'harborServer'),
          data,
          totalCount:        parseInt(resp.headers.map['x-total-count'] || 0),
          harborServerError: false,
        };
      }).catch(() => {
        return {
          harborServer:      get(this, 'harborServer'),
          data:              [],
          totalCount:        0,
          harborServerError: true,
        };
      });
    }

    return {
      harborServer:      get(this, 'harborServer'),
      data:              [],
      totalCount:        0,
      harborServerError: false,
    }
  },
  resetController(controller) {
    controller.set('page', 1);
    controller.set('keyName', '');
    controller.set('keyValue', '');
  },
  actions: {
    error(error) {
      if (error.status) {
        this.transitionTo('image-repo.index');
      } else {
        return true;
      }
    },
    refreshModel() {
      this.refresh();
    }
  },
  queryParams: {
    page:     { refreshModel: true },
    keyName:  { refreshModel: true },
    keyValue: { refreshModel: true },
  },
});
