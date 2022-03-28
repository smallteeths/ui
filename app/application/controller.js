import { oneWay } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import Controller from '@ember/controller';
import { run } from '@ember/runloop';
import { observer, set, computed, get } from '@ember/object';
import C from 'shared/utils/constants';

export default Controller.extend({
  settings: service(),
  session:    service(),

  resourceActions:   service('resource-actions'),
  tooltipService:    service('tooltip'),
  router:            service(),

  // GitHub auth params
  queryParams: ['isPopup', 'fromAuthProvider'],

  error:             null,
  error_description: null,
  state:             null,
  code:              null,
  isPopup:           null,
  isEmbedded:        false,

  tooltip:           oneWay('tooltipService.tooltipOpts.type'),
  tooltipTemplate:   oneWay('tooltipService.tooltipOpts.template'),

  init() {
    this._super(...arguments);

    if ( this.get('app.environment') === 'development' ) {
      run.backburner.DEBUG = true;
    }

    const embedded = window.top !== window;

    set(this, 'isEmbedded', embedded);
  },

  // currentRouteName is set by Ember.Router
  // but getting the application controller to get it is inconvenient sometimes
  currentRouteNameChanged: observer('router.currentRouteName', function() {
    this.set('app.currentRouteName', this.get('router.currentRouteName'));
  }),

  faviconurlChanged: observer('settings.uiFavicon', 'settings.all.length', function() {
    this.setFavicon();
  }),

  isLeftMenu: computed(`session.${ C.PREFS.MENU }`, function() {
    return get(this, `session.${ C.PREFS.MENU }`) === 'left';
  }),
  setFavicon(){
    let faviconurl = get(this, 'settings.uiFavicon');
    const settingPending = !get(this, 'settings.all.length');

    if (!settingPending) {
      if (get(this, 'settings.uiFavicon')) {
        faviconurl = get(this, 'settings.uiFavicon');
      } else {
        faviconurl = '/assets/images/logos/favicon.ico'
      }
    } else {
      return;
    }

    let link = document.querySelector("head link[rel*='icon']");

    if (!link){
      link = document.createElement('link');

      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = faviconurl;

      document.getElementsByTagName('head')[0].appendChild(link);
    } else {
      link.setAttribute('href', faviconurl);
    }
  }
});
