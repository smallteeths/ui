import Route from '@ember/routing/route';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';

export default Route.extend({
  harborV2:     service(),
  access:       service(),
  globalStore:  service(),
  app:          service(),
  prefs:        service(),
  harborServer: '',
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
      name:      params.name || '',
      public:    params.isPublic || '',
      page_size: pageSize,
      page,
    };

    if (get(this, 'harborServer')) {
      const projects = get(this, 'harborV2').fetchProjects(p).then((resp) => {
        const data = resp.body || [];

        data.forEach((item) => {
          item.displayName = item.name;
        });

        return {
          data,
          totalCount:   parseInt(resp.headers.map['x-total-count'] || 0),
        };
      }).catch(() => {
        return {
          data:         [],
          totalCount:   0,
        };
      });
      const currentUser = get(this, 'harborV2').fetchCurrentHarborUser().then((resp) => resp.body).catch(() => {
        return { harborServerError: true }
      });
      const harborVersion = get(this, 'harborV2').fetchSystemInfo().catch(() => {});

      return hash({
        harborServer:      get(this, 'harborServer'),
        harborVersion,
        projects,
        currentUser,
        page,
        harborServerError: false,
      }).then((hash) => {
        if (hash.currentUser.harborServerError && get(this, 'harborServer')) {
          set(hash, 'harborServerError', true)
        }

        return hash;
      });
    }

    return {
      harborServer:      '',
      data:              [],
      totalCount:        0,
      harborServerError: false,
      page,
    }
  },
  resetController(controller) {
    controller.set('page', 1);
    controller.set('name', '');
    controller.set('isPublic', '');
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
