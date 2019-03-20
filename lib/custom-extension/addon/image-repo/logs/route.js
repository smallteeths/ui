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
    const paramStr = params.keyName ? `&${ params.keyName }=${ params.keyValue }` : '';
    const page = params.page || 1;
    const pageSize = get(this, 'prefs.tablePerPage');

    if (get(this, 'harborServer')) {
      return get(this, 'harbor').getLogList( page, pageSize, paramStr).then((resp) => {
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
