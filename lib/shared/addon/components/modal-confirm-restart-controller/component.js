import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import Component from '@ember/component';
import ModalBase from 'shared/mixins/modal-base';
import layout from './template';
import $ from 'jquery';

export default Component.extend(ModalBase, {
  intl: service(),

  layout,
  classNames:    ['medium-modal', 'modal-logs'],
  cluster:       alias('modalService.modalOpts.cluster'),
  didRender() {
    setTimeout(() => {
      try {
        $('BUTTON')[0].focus();
      } catch (e) {}
    }, 500);
  },

  actions: {
    confirm() {
      this.modalService.modalOpts.action();
      this.send('cancel');
    },
  },
});
