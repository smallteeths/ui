import Component from '@ember/component';
import layout from './template';
import ModalBase from 'shared/mixins/modal-base';
import { get, set } from '@ember/object';
import { alias } from '@ember/object/computed';

export default Component.extend(ModalBase, {
  layout,

  classNames: ['medium-modal'],

  sourceProject:   alias('modalOpts.sourceProject'),
  targetProject:   alias('modalOpts.targetProject'),
  sourceNamespace: alias('modalOpts.sourceNamespace'),
  targetNamespace: alias('modalOpts.targetNamespace'),
  sourceCluster:   alias('modalOpts.sourceCluster'),
  targetCluster:   alias('modalOpts.targetCluster'),
  model:           alias('modalOpts.model'),

  actions: {
    confirm() {
      get(this, 'modalOpts').cb(true);
      this.send('close');
    },

    cancel() {
      get(this, 'modalOpts').cb(false);
      this.send('close');
    },
    toggleDetail(row) {
      set(row, 'detail', !row.detail);
    }
  },
});
