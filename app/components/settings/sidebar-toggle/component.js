import { get, computed } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import C from 'ui/utils/constants';
import layout from './template';

export default Component.extend({
  prefs:        service(),
  menuPosition: service('menu-position'),

  layout,
  actions: {
    toogleMenu(position) {
      const menuPosition = get(this, 'menuPosition');
      const currentPosition = menuPosition.getPosition();

      if (position !== currentPosition) {
        menuPosition.setPosition(position);
      }
    }
  },

  menu: computed(`prefs.${ C.PREFS.MENU }`, function() {
    return get(this, `prefs.${ C.PREFS.MENU }`) || 'left';
  }),

});