// import $ from 'jquery';
import Service, { inject as service } from '@ember/service';
import C from 'shared/utils/constants';
import { get, set } from '@ember/object';

const LEFT = 'left';

export default Service.extend({
  prefs:           service(),
  session:         service(),
  currentPosition: null,

  setupMenuPostion() {
    const position    = get(this, `prefs.${ C.PREFS.MENU }`);
    const defaultPosition = get(this, 'session').get(C.PREFS.MENU);

    if (position !== LEFT || defaultPosition !== LEFT){
      this.setPosition(LEFT)
    } else {
      set(this, 'currentPosition', position);
    }
  },

  setPosition(newPosition, save = true) {
    if ( save ) {
      set(this, `prefs.${ C.PREFS.MENU }`, newPosition);
    }
    set(this, 'currentPosition', newPosition);
    // this.writeStyleNode();
    get(this, 'session').set(C.PREFS.MENU, newPosition);
  },

  getPosition() {
    return get(this, `prefs.${ C.PREFS.MENU }`);
  },

  // writeStyleNode() {
  //   const position = get(this, 'currentPosition');

  //   if (position === 'left') {
  //     if (!$('#application').hasClass('container-nav-left')) {
  //       $('#application').addClass('container-nav-left');
  //     }
  //   } else {
  //     $('#application').removeClass('container-nav-left');
  //   }
  // },

});
