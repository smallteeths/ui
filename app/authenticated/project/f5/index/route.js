import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import C from 'ui/utils/constants';
import { on } from '@ember/object/evented';
import { get, set } from '@ember/object';
import { alias } from '@ember/object/computed';

const DEFAULT_ROUTE = 'authenticated.project.f5.controllers';
const VALID_ROUTES = [DEFAULT_ROUTE, 'authenticated.project.f5.tls'];

export default Route.extend({
  scope:          service(),
  currentCluster: alias('scope.currentCluster'),

  redirect() {
    let route = this.get(`session.${ C.SESSION.F5_ROUTE }`);

    if ( !VALID_ROUTES.includes(route) ) {
      route = DEFAULT_ROUTE;
    }

    this.replaceWith(route);
  },

  setDefaultRoute: on('activate', function() {
    set(this, `session.${ C.SESSION.PROJECT_ROUTE }`, 'authenticated.project.f5');
  }),
});
