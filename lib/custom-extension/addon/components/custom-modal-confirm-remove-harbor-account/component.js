import $ from 'jquery';
import { next } from '@ember/runloop';
import Component from '@ember/component';
import layout from './template';
import C from 'ui/utils/constants';
import { get, set, computed, observer } from '@ember/object';
import { inject as service } from '@ember/service';
import { htmlSafe } from '@ember/string';

export default Component.extend({
  settings:              service(),
  intl:                  service(),
  layout,
  tagName:               'div',
  classNames:            ['modal-overlay'],
  classNameBindings:     ['modalVisible:modal-open:modal-closed'],
  modalVisible:          false,
  escToClose:            false,
  modalOpts:             null,
  lastScroll:            null,
  closeWithOutsideClick: false,
  resources:             null,
  showProtip:            false,
  attributeBindings:     ['style'],
  delayTimer:            null,
  awaitSeconds:          3,

  style:                 htmlSafe('position: fixed'),

  didRender() {
    setTimeout(() => {
      try {
        this.$('BUTTON')[0].focus();
      } catch (e) {}
    }, 500);
  },
  actions:               {
    close() {
      this.toggleModal();
    },

    cancel() {
      this.toggleModal();
    },
    confirm() {
      this.sendAction('confirm');
    },
  },
  visible: observer('modalVisible', function() {
    const v = get(this, 'modalVisible');

    if (!v) {
      clearTimeout(get(this, 'delayTimer'));
      set(this, 'delayTimer', null);
      set(this, 'awaitSeconds', 3);
    } else {
      get(this, 'btnDisabled') && this.delayTime(3);
    }
  }),
  btnDisabled: computed('modalVisible', 'awaitSeconds', function() {
    const v = get(this, 'modalVisible');

    if (v) {
      return get(this, 'awaitSeconds') > 0;
    }

    return false;
  }),
  click(e) {
    if (get(this, 'closeWithOutsideClick') && $(e.target).hasClass('modal-open')) {
      this.toggleModal();
    }
  },
  keyUp(e) {
    if (e.which === C.KEY.ESCAPE && this.escToClose()) {
      this.toggleModal();
    }
  },
  toggleModal(type = null, opts = null) {
    if (opts) {
      set(this, 'modalOpts', opts);
    }

    set(this, 'modalType', type);

    if ( get(this, 'modalVisible') ) {
      set(this, 'modalVisible', false);
      set(this, 'modalOpts', null);
      next(() => {
        window.scrollTo(0, get(this, 'lastScroll'));
      });
    } else {
      set(this, 'lastScroll', window.scrollY);
      set(this, 'modalVisible', true);
      next(() => {
        window.scrollTo(0, 0);
      });
    }
  },
  delayTime(sec){
    let delayTimer = setTimeout( () => {
      if (sec > 0){
        set(this, 'awaitSeconds', --sec);
        this.delayTime(sec)
      }
    }, 1000);

    set(this, 'delayTimer', delayTimer);
  },
});