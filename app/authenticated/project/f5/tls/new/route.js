import { hash } from 'rsvp';
import { get } from '@ember/object'
import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';

export default Route.extend({
  scope:          service(),
  currentCluster: alias('scope.currentCluster'),

  model() {
    const store = get(this, 'store');
    const tlsProfile = store.createRecord({
      type:  'tlsprofile',
      name:  '',
      hosts: [],
      tls:   {
        reference:   'bigip',
        termination: 'edge'
      }
    })

    return hash({ tlsProfile });
  },

  redirect() {
    if (get(this, 'currentCluster.id') === 'local'){
      this.replaceWith('authenticated.project.index');
    }
  },
});
