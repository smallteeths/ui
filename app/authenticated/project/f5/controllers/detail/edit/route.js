import { hash } from 'rsvp';
import Route from '@ember/routing/route';

export default Route.extend({
  model() {
    const f5 = this.modelFor('authenticated.project.f5.controllers.detail').f5;
    const tlsProfiles = this.modelFor('authenticated.project.f5.controllers.detail').tlsProfiles;
    const isVirtualServer = this.modelFor('authenticated.project.f5.controllers.detail').isVirtualServer;

    return hash({
      f5: f5.clone(),
      tlsProfiles,
      isVirtualServer
    });
  }
});
