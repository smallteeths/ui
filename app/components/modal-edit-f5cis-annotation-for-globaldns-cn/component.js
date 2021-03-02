import { alias } from '@ember/object/computed';
import Component from '@ember/component';
import NewOrEdit from 'shared/mixins/new-or-edit';
import ModalBase from 'shared/mixins/modal-base';
import layout from './template';
import { inject as service } from '@ember/service';
import { set, get } from '@ember/object';

const globalDNSAnnotaion = 'rancher.io/globalDNS.hostname'

export default Component.extend(ModalBase, NewOrEdit, {
  scope: service(),

  layout,
  classNames: ['medium-modal'],
  editing:    true,
  rootDomain: '',

  model:          alias('modalService.modalOpts.model'),

  init() {
    this._super(...arguments);
    let rootDomain = get(this, 'model.annotations') && get(this, 'model.annotations')[globalDNSAnnotaion] ? get(this, 'model.annotations')[globalDNSAnnotaion] : ''

    set(this, 'rootDomain', rootDomain)
  },

  willSave() {
    let annotations = get(this, 'model.annotations') ? get(this, 'model.annotations') : {}

    if (get(this, 'rootDomain')) {
      annotations[globalDNSAnnotaion] = get(this, 'rootDomain')
    } else if (annotations[globalDNSAnnotaion]) {
      delete annotations[globalDNSAnnotaion]
    }
    set(this, 'model.annotations', annotations)

    return this._super(...arguments);
  },

  doneSaving() {
    this.send('cancel');
  }
});