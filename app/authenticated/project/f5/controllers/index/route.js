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
      _hash = {
        virtualservers:    store.findAll('virtualserver'),
        transportservers:  store.findAll('transportserver'),
      }
    }

    return hash(_hash);
  },

  // eslint-disable-next-line ember/order-in-controllers
  setDefaultRoute: on('activate', function() {
    set(this, `session.${ C.SESSION.F5_ROUTE }`, 'controllers');
    set(this, `session.${ C.SESSION.PROJECT_ROUTE }`, 'authenticated.project.f5');
  }),
});
