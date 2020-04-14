import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';
import { get } from '@ember/object';

export default Route.extend({
  language:   service('user-language'),
  autoLogout: service(),

  beforeModel() {
    return this.get('language').initLanguage();
  },

  redirect() {
    let url = this._router.location.formatURL('/not-found');

    if (window.location.pathname !== url) {
      this.transitionTo('not-found');
    }
  },

  activate() {
    $('BODY').addClass('container-farm'); // eslint-disable-line
    get(this, 'autoLogout').stop()
  },

  deactivate(params, transition) {
    $('BODY').removeClass('container-farm'); // eslint-disable-line
    get(this, 'autoLogout').start(transition)
  },
});
