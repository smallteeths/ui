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
        return AWS.util.base64.decode(resp.body.value).toString();
      });
    }

    return hash({
      harborUser,
      harborServer: get(this, 'harborServer'),
    });
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
