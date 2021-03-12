import Route from '@ember/routing/route';
import { get } from '@ember/object';
import { hash } from 'rsvp';

export default Route.extend({
  model(params) {
    const store = get(this, 'store');
    let f5 = null;
    let isVirtualServer = true;
    const tlsProfiles = store.findAll('tlsprofile');

    if (params.type === 'transportServer') {
      f5 = store.find('transportserver', params.controller_id);
      isVirtualServer = false;
    } else {
      f5 = store.find('virtualServer', params.controller_id)
    }


    return hash({
      f5,
      isVirtualServer,
      tlsProfiles
    })
  }
});
