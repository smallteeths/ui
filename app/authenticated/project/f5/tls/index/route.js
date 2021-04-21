import { on } from '@ember/object/evented';
import { hash } from 'rsvp';
import { get, set } from '@ember/object';
import Route from '@ember/routing/route';
import C from 'ui/utils/constants';
import { inject as service } from '@ember/service';

export default Route.extend({
  scope: service(),

  model() {
    const store = this.get('store');
    let _hash = {};

    if (get(this, 'scope.currentCluster.enableF5CIS')) {
      _hash = { tlsprofiles: store.findAll('tlsprofile') }
    }

    return hash(_hash);
  },

  setDefaultRoute: on('activate', function() {
    set(this, `session.${ C.SESSION.F5_ROUTE }`, 'authenticated.project.f5.tls');
    set(this, `session.${ C.SESSION.PROJECT_ROUTE }`, 'authenticated.project.f5');
  }),
});
