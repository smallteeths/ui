import Route from '@ember/routing/route';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';

export default Route.extend({
  harbor:       service(),
  access:       service(),
  globalStore:  service(),
  harborServer: '',
  beforeModel() {
    this._super(...arguments);

    return get(this, 'harbor').loadHarborServerUrl().then((resp) => {
      set(this, 'harborServer', resp);
    });
  },
  model() {
    let harborUser = null;

    if (get(this, 'harborServer')) {
      harborUser = get(this, 'harbor').fetchHarborUserInfo().then((resp) => {
        return resp.body.value;
      });
    }

    return hash({
      harborUser,
      harborServer:     get(this, 'harborServer'),
      harborSystemInfo: {}
    });
  },
  afterModel(model) {
    if (model.harborServer) {
      return this.harbor.fetchSystemInfo().then((resp) => {
        set(model, 'harborSystemInfo', resp)
      }).catch((err) => {
        console.error('fetch harbor system info failed: ', err)
      })
    }
  },
  redirect() {
    if (!get(this, 'access.me.hasAdmin')) {
      return this.replaceWith('image-repo.user-config.index');
    }
  },
  actions: {
    refreshModel() {
      this.refresh();
    }
  },
});
