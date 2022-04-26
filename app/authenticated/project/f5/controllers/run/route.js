import { hash } from 'rsvp';
import { get, set } from '@ember/object'
import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';

export default Route.extend({
  scope:          service(),
  currentCluster: alias('scope.currentCluster'),

  model() {
    const store = get(this, 'store');
    const f5 = {
      virtualServerHTTPPort:  80,
      virtualServerHTTPSPort: 443,
      mode:                   'standard',
      tsType:                 'tcp',
    };
    const tlsProfiles = store.findAll('tlsprofile');

    return hash({
      tlsProfiles,
      f5
    })
  },

  redirect() {
    if (get(this, 'currentCluster.id') === 'local'){
      this.replaceWith('authenticated.project.index');
    }
  },
  resetController(controller, isExisting) {
    if (isExisting) {
      set(controller, 'type', null);
    }
  },
});
