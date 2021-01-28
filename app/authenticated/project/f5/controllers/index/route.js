import { on } from '@ember/object/evented';
import { hash } from 'rsvp';
import { set } from '@ember/object';
import Route from '@ember/routing/route';
import C from 'ui/utils/constants';

export default Route.extend({
  model() {
    const store = this.get('store');

    return hash({
      virtualservers:    store.findAll('virtualserver'),
      transportservers:  store.findAll('transportserver'),
    }).then((hash) => {
      console.log(hash);

      return hash;
    });
  },

  setDefaultRoute: on('activate', function() {
    set(this, `session.${ C.SESSION.F5_ROUTE }`, 'controllers');
    set(this, `session.${ C.SESSION.PROJECT_ROUTE }`, undefined);
  }),
});
