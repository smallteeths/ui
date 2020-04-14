import Service, { inject as service } from '@ember/service';
import { get, set, computed } from '@ember/object';

export default Service.extend({
  intl:         service(),
  growl:        service(),
  settings:     service(),
  transition:   null,
  operateTypes: ['mousemove', 'mousedown', 'keydown', 'scroll'],
  timer:        null,
  timeInterval: 60 * 1000,
  lastTime:     null,
  timeout:      computed('settings.none-operate-session-time', function() {
    return parseInt(get(this, 'settings.none-operate-session-time')) * 1000
  }),
  errorTitle:   computed('intl.locale', function() {
    return get(this, 'intl').t('growl.autoLogout.title')
  }),
  errorMessage:   computed('intl.locale', function() {
    return get(this, 'intl').t('growl.autoLogout.message')
  }),

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
        get(self, 'transition').send('logout');
        self.stop();
        set(self, 'lastTime', new Date().getTime());
        get(self, 'growl').fromError(get(self, 'errorTitle'), get(self, 'errorMessage'));
      }
    }
  },
  doOperate() {
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
