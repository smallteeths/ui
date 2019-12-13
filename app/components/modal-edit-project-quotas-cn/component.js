import { alias } from '@ember/object/computed';
import Component from '@ember/component';
import NewOrEdit from 'shared/mixins/new-or-edit';
import ModalBase from 'shared/mixins/modal-base';
import layout from './template';
import { inject as service } from '@ember/service';
import { get, setProperties } from '@ember/object';

export default Component.extend(ModalBase, NewOrEdit, {
  scope: service(),

  layout,
  classNames:    ['large-modal'],

  callback:       alias('modalService.modalOpts.cb'),
  originalModel:  alias('modalService.modalOpts.model'),

  init() {
    this._super(...arguments);

    const orig  = get(this, 'originalModel');
    const clone = orig.clone();

    delete clone.services;

    setProperties(this, { model: clone })
  },

  didRender() {
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 500);
  },

  actions: {
    updateQuota(quota) {
      const model = get(this, 'model');

      if ( quota ) {
        setProperties(model, quota);
      } else {
        setProperties(model, {
          resourceQuota:                 null,
          namespaceDefaultResourceQuota: null,
        });
      }
    },
  },

  doSave(opt) {
    opt = opt || {};
    opt.qp = { '_replace': 'true' };

    return this._super(opt);
  },

  doneSaving() {
    get(this, 'callback')();
  }

});
