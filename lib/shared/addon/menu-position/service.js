import $ from 'jquery';
import Service, { inject as service } from '@ember/service';
import C from 'shared/utils/constants';
import { get, set } from '@ember/object';


export default Service.extend({
  prefs:           service(),
  session:         service(),
  currentPosition: null,

  setupMenuPostion() {
    const position    = get(this, `prefs.${ C.PREFS.MENU }`);
    const defaultPosition = get(this, 'session').get(C.PREFS.MENU);

    if (position) {
      if (position !== defaultPosition) {
        this.setPosition(position)
      } else {
        set(this, 'currentPosition', position);
        this.writeStyleNode();
      }
      get(this, 'session').set(C.PREFS.MENU, position);
    } else { // no user pref'd menu position
      set(this, `prefs.${ C.PREFS.MENU }`, 'left');
      set(this, 'currentPosition', 'left');
      this.writeStyleNode();
    }
  },

  setPosition(newPosition, save = true) {
    if ( save ) {
      set(this, `prefs.${ C.PREFS.MENU }`, newPosition);
    }
    set(this, 'currentPosition', newPosition);
    this.writeStyleNode();
    get(this, 'session').set(C.PREFS.MENU, newPosition);
  },

  getPosition() {
    return get(this, `prefs.${ C.PREFS.MENU }`);
  },

  writeStyleNode() {
    const position = get(this, 'currentPosition');

    if (position === 'left') {
      if (!$('#application').hasClass('container-nav-left')) {
        $('#application').addClass('container-nav-left');
      }
    } else {
      $('#application').removeClass('container-nav-left');
    }
  },

});
