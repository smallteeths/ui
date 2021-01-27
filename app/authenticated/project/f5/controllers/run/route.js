import { hash } from 'rsvp';
import { get, set } from '@ember/object'
import Route from '@ember/routing/route';

export default Route.extend({
  model(params) {
    const store = get(this, 'store');
    const f5 = {
      virtualServerHTTPPort:  80,
      virtualServerHTTPSPort: 443,
      mode:                   'standard'
    };
    const tlsProfiles = store.findAll('tlsprofile');

    return hash({
      tlsProfiles,
      f5
    })
  },

  resetController(controller, isExisting) {
    if (isExisting) {
      set(controller, 'type', null);
    }
  },

  actions: {
    cancel() {
      this.goToPrevious();
    },
  }
});
