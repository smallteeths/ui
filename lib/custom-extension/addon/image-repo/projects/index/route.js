import Route from '@ember/routing/route';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';

export default Route.extend({
  harbor:       service(),
  access:       service(),
  globalStore:  service(),
  app:          service(),
  prefs:        service(),
  harborServer: '',
  beforeModel() {
    this._super(...arguments);

    return get(this, 'harbor').loadHarborServerUrl().then((resp) => {
      set(this, 'harborServer', resp);
    });
  },
  model(params) {
    const name = params.name ? `&name=${ params.name }` : '';
    const isPublic = params.isPublic ? `&public=${ params.isPublic }` : '';
    const page = params.page || 1;
    const pageSize = get(this, 'prefs.tablePerPage');

    if (get(this, 'harborServer')) {
      return get(this, 'harbor').getProjectList(name, page, pageSize, isPublic).then((resp) => {
        const data = resp.body;

        data.forEach((item) => {
          item.displayName = item.name;
        });

        return {
          harborServer: get(this, 'harborServer'),
          data,
          totalCount:   parseInt(resp.headers.map['x-total-count'] || 0),
        };
      });
    }

    return {
      harborServer: '',
      data:         [],
      totalCount:   0,
    }
  },
  actions: {
    refreshModel() {
      this.refresh();
    }
  },
  queryParams: {
    page:     { refreshModel: true },
    name:     { refreshModel: true },
    isPublic: { refreshModel: true },
  },
});
