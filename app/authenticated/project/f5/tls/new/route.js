import { hash } from 'rsvp';
import { get, set } from '@ember/object'
import Route from '@ember/routing/route';

export default Route.extend({
  model() {
    const store = get(this, 'store');
    const tlsProfile = store.createRecord({
      type:  'tlsprofile',
      name:  '',
      hosts: [],
      tls:   { reference: 'bigip' }
    })

    return hash({ tlsProfile });
  }
});
