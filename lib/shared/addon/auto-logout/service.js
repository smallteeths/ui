import Service, { inject as service } from '@ember/service';
import { get, set, computed, observer } from '@ember/object';

export default Service.extend({
  intl:         service(),
  growl:        service(),
  settings:     service(),
  transition:   null,
  operateTypes: ['mousemove', 'mousedown', 'keydown', 'scroll'],
  timer:        null,
  logoutTimer:  null,
  timeInterval: 60 * 1000,
  lastTime:     null,
  growlShown:   false,

  timeout: computed('settings.none-operate-session-time', function() {
    return parseInt(get(this, 'settings.none-operate-session-time')) * 1000
  }),
  errorTitle: computed('intl.locale', function() {
    return get(this, 'intl').t('growl.autoLogout.title')
  }),
  errorMessage: computed('intl.locale', function() {
    return get(this, 'intl').t('growl.autoLogout.message', { autoLogoutTime: Math.ceil(parseInt(get(this, 'timeout')) / 1000 / 60) })
  }),
  growlNeedShow: observer('growlShown', function() {
    if (get(this, 'growlShown')) {
      get(this, 'growl').fromError(get(this, 'errorTitle'), get(this, 'errorMessage'));
    } else {
      get(this, 'growl').close()
    }
  }),

  init() {
    this.doOperate = this.doOperate.bind(this);
    this._super(...arguments);
  },
  start(transition) {
    set(this, 'lastTime', new Date().getTime());

    if (get(this, 'timer') !== null) {
      return;
    }
    if (get(this, 'transition') === null) {
      set(this, 'transition', transition)
    }

    this.bindListeners();
    set(this, 'timer', window.setInterval(this.checkTimeout(this), get(this, 'timeInterval')))
  },
  stop() {
    this.unbindListeners();
    clearInterval(get(this, 'timer'));
    set(this, 'timer', null)
  },
  checkTimeout(self) {
    return function() {
      const currentTime = new Date().getTime();

      if (currentTime - get(self, 'lastTime') > get(self, 'timeout')) {
        set(self, 'growlShown', true);
        set(self, 'logoutTimer', window.setTimeout(() => {
          self.stop();
          set(self, 'lastTime', new Date().getTime());
          get(self, 'transition').send('logout')
        }, 5000));
      }
    }
  },
  doOperate() {
    if (get(this, 'growlShown')) {
      set(this, 'growlShown', false);
    }
    if (get(this, 'logoutTimer') !== null) {
      window.clearTimeout(get(this, 'logoutTimer'));
      set(this, 'logoutTimer', null)
    }
    set(this, 'lastTime', new Date().getTime());
  },
  bindListeners() {
    get(this, 'operateTypes').forEach( (item) => {
      window.document.addEventListener(item, this.doOperate);
    });
  },
  unbindListeners() {
    get(this, 'operateTypes').forEach( (item) => {
      window.document.removeEventListener(item, this.doOperate);
    });
  }
});
