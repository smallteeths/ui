import Route from '@ember/routing/route';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';

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
    const page = params.page || 1;
    const pageSize = get(this, 'prefs.tablePerPage');
    const p = {
      name:      params.name || '',
      public:    params.isPublic || '',
      page_size: pageSize,
      page,
    };

    if (get(this, 'harborServer')) {
      const projects = get(this, 'harbor').fetchProjects(p).then((resp) => {
        const data = resp.body || [];

        data.forEach((item) => {
          item.displayName = item.name;
        });

        return {
          data,
          totalCount:   parseInt(resp.headers.map['x-total-count'] || 0),
        };
      });
      const currentUser = get(this, 'harbor').fetchCurrentHarborUser().then((resp) => resp.body);

      return hash({
        harborServer: get(this, 'harborServer'),
        projects,
        currentUser,
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
    },
    error(error) {
      if (error.status) {
        this.transitionTo('image-repo.index');
      } else {
        return true;
      }
    },
  },
  queryParams: {
    page:     { refreshModel: true },
    name:     { refreshModel: true },
    isPublic: { refreshModel: true },
  },
});
