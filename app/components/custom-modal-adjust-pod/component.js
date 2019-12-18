import $ from 'jquery';
import { next } from '@ember/runloop';
import Component from '@ember/component';
import layout from './template';
import C from 'ui/utils/constants';
import { get, set, observer } from '@ember/object';
import Errors from 'ui/utils/errors';
import { htmlSafe } from '@ember/string';
import { inject as service } from '@ember/service';

export default Component.extend({
  intl:                  service(),
  layout,
  tagName:               'div',
  classNames:            ['modal-overlay'],
  classNameBindings:     ['modalVisible:modal-open:modal-closed'],
  models:                null,
  podChangeNum:          null,
  errors:                null,
  modalVisible:          false,
  escToClose:            false,
  modalOpts:             null,
  lastScroll:            null,
  closeWithOutsideClick: false,
  pod:                   { pod_num: 0 },
  showProtip:            false,
  attributeBindings:     ['style'],
  style:                 htmlSafe('position: fixed'),

  actions: {
    error(err) {
      if (err) {
        var body = Errors.stringify(err);

        if (body) {
          set(this, 'errors', [body]);
        }
      } else {
        set(this, 'errors', null);
      }
    },
    close() {
      this.toggleModal();
    },

    cancel() {
      this.toggleModal();
    },
    confirm() {
      let ok = this.validate();

      if (!ok) {
        return;
      }

      this.sendAction('saved', { podNum: get(this, 'pod.pod_num') });
      this.toggleModal();
    },
    podDown(){
      this.adjustPod(-1);
    },
    podUp(){
      this.adjustPod(1);
    }
  },
  visible: observer('modalVisible', function() {
    const v = get(this, 'modalVisible');

    if (v) {
      set(this, 'errors', null);
      this.adjustPod(get(this, 'podChangeNum'), get(this, 'models.scale'));
    }
  }),
  validate() {
    const intl = get(this, 'intl');
    const errors = [];
    const pod = get(this, 'pod');
    const nameReg = /^[0-9]*$/;

    if (pod.pod_num === '') {
      errors.push(intl.t('servicePage.multistat.podNum.error.required'));
    } else if (!nameReg.test(pod.pod_num)) {
      errors.push(intl.t('servicePage.multistat.podNum.error.typeError'));
    }
    if (errors.length > 0) {
      set(this, 'errors', errors);

      return false;
    }
    set(this, 'errors', null);

    return true;
  },
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
  toggleModal(opts = null) {
    if (opts) {
      set(this, 'modalOpts', opts);
    }

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
  adjustPod(num, scale){
    if (!num) {
      return;
    }
    let podNum = scale || get(this, 'pod.pod_num') || 0;
    let newPodNum = Math.max(podNum + num, 0);

    set(this, 'pod.pod_num', newPodNum);
    set(this, 'showAddPodModal', true);
  }
});
