import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { get, set } from '@ember/object';
import { hash } from 'rsvp';

export default Route.extend({
  harbor:       service(),
  harborServer: '',
  beforeModel() {
    this._super(...arguments);

    return get(this, 'harbor').loadHarborServerUrl().then((resp) => {
      set(this, 'harborServer', resp);
    });
  },
  model() {
    return hash({
      harborServer: get(this, 'harborServer'),
      account:              {
        email:    '',
        password: '',
      },
    });
  },
  actions: {
    refreshModel() {
      this.refresh();
    }
  },
});
