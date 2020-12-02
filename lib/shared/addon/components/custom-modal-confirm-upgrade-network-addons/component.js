import { get } from '@ember/object';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import Component from '@ember/component';
import ModalBase from 'shared/mixins/modal-base';
import layout from './template';
import $ from 'jquery';

export default Component.extend(ModalBase, {
  intl: service(),

  layout,
  classNames:     ['medium-modal'],
  cluster:         alias('modalOpts.cluster'),
  clusterName:     alias('cluster.name'),
  networkPlugin:   alias('modalOpts.networkPlugin'),

  didRender() {
    setTimeout(() => {
      try {
        $('BUTTON')[0].focus();
      } catch (e) {}
    }, 500);
  },

  actions: {
    confirm(cb) {
      cb();
      get(this, 'modalOpts.upgrade')(this.cluster);
      this.send('cancel');
    },
  },
});
