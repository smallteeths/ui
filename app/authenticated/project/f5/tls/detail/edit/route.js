import Route from '@ember/routing/route';
import { hash } from 'rsvp';

export default Route.extend({
  model() {
    const original = this.modelFor('authenticated.project.f5.tls.detail').tlsProfile;

    return hash({ tlsProfile: original.clone() });
  },
});
