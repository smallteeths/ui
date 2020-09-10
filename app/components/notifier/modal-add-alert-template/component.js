import { alias } from '@ember/object/computed';
import Component from '@ember/component';
import ModalBase from 'shared/mixins/modal-base';
import { get, set } from '@ember/object'
import { inject as service } from '@ember/service';
import layout from './template';

export default Component.extend(ModalBase, {
  growl:      service(),
  intl:       service(),

  layout,
  classNames: ['large-modal'],

  editing:    true,
  saving:     false,
  tmpl:       '',
  tmplByUser: '',
  enabled:    true,

  callback: alias('modalService.modalOpts.callback'),
  mode:     alias('modalService.modalOpts.mode'),

  controller: alias('modalService.modalOpts.controller'),


  notificationtemplate:  alias('modalService.modalOpts.notificationtemplate'),
  notificationSecret:    alias('modalService.modalOpts.notificationSecret'),
  init() {
    this._super(...arguments);

    if (get(this, 'notificationSecret') && get(this, 'notificationSecret.data') && get(this, 'notificationSecret.data')['notification.tmpl']) {
      set(this, 'tmpl', AWS.util.base64.decode(get(this, 'notificationSecret.data')['notification.tmpl']));
      if (get(this, 'notificationtemplate') && get(this, 'notificationtemplate.content')) {
        set(this, 'tmplByUser', get(this, 'notificationtemplate.content'));
        set(this, 'enabled', get(this, 'notificationtemplate.enabled'))
      } else {
        set(this, 'tmplByUser', String(AWS.util.base64.decode(get(this, 'notificationSecret.data')['notification.tmpl'])));
      }
    }
  },

  actions: {
    save() {
      let secretValue = get(this, 'tmplByUser')

      get(this, 'callback')(secretValue, get(this, 'enabled'), this)
    },
  },

  addBtnLabel: function() {
    const mode = get(this, 'mode');

    if (mode === 'edit') {
      return 'generic.save';
    } else if (mode === 'clone') {
      return 'notifierPage.clone';
    } else if (mode === 'add') {
      return 'generic.add';
    }
  }.property('mode'),
});
