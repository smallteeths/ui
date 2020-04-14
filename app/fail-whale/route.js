import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';
import { get } from '@ember/object';

export default Route.extend({
  storeReset: service(),
  settings:   service(),
  autoLogout: service(),

  model() {
    return this.controllerFor('application').get('error');
  },

  afterModel(model) {
    if ( model ) {
      this.get('storeReset').reset();
    } else {
      this.transitionTo('authenticated');
    }
  },
  actions: {
    activate() {
      $('BODY').addClass('farm'); // eslint-disable-line
      get(this, 'autoLogout').stop()
    },

    deactivate(params, transition) {
      $('BODY').removeClass('farm'); // eslint-disable-line
      get(this, 'autoLogout').start(transition)
    },
  },

});
