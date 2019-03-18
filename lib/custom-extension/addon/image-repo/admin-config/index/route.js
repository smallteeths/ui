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
        return atob(resp.body.value);
      });
    }

    return hash({
      harborUser,
      harborServer: get(this, 'harborServer'),
    });
  },
  actions: {
    refreshModel() {
      this.refresh();
    }
  },
});
