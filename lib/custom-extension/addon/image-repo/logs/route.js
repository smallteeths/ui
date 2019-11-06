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
      return get(this, 'harbor').fetchLogs(p).then((resp) => {
        const data = resp.body;

        return {
          harborServer: get(this, 'harborServer'),
          data,
          totalCount:   parseInt(resp.headers.map['x-total-count'] || 0),
        };
      });
    }

    return {
      harborServer: get(this, 'harborServer'),
      data:         [],
      totalCount:   0
    }
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
