import Route from '@ember/routing/route';
import C from 'ui/utils/constants';
import { on } from '@ember/object/evented';
import { set } from '@ember/object';

const DEFAULT_ROUTE = 'authenticated.project.f5.controllers';
const VALID_ROUTES = [DEFAULT_ROUTE, 'authenticated.project.f5.tls'];

export default Route.extend({
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
