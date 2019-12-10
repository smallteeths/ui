import { alias } from '@ember/object/computed';
import Component from '@ember/component';
import { get, computed } from '@ember/object';
import NewOrEdit from 'ui/mixins/new-or-edit';
import { inject as service } from '@ember/service';
import ModalBase from 'shared/mixins/modal-base';
import layout from './template';

const cmOpts = {
  autofocus:       false,
  gutters:          ['CodeMirror-lint-markers'],
  lineNumbers:     true,
  lineWrapping:    true,
  readOnly:        true,
  mode:            {
    name:          'javascript',
    json:          true,
  },
  theme:           'monokai',
  viewportMargin:   Infinity,
};

export default Component.extend(ModalBase, NewOrEdit, {
  intl:  service(),
  growl: service(),
  scope: service(),

  layout,
  model:             null,
  errors:            null,
  codeMirrorOptions: cmOpts,
  classNames:        ['modal-container', 'large-modal', 'modal-shell', 'alert'],

  resource:     alias('modalService.modalOpts.resource'),
  init() {
    this._super(...arguments);
    // set(this, 'formattedValue', JSON.stringify(JSON.parse(get(this, 'model.obj.value')), undefined, 2));
  },

  actions: {
    cancel() {
      // this.send('cancel');
      return this._super(...arguments);
    },

    close() {
      return this._super(...arguments);
    },
  },
  requestBody:  computed('resource.requestBody', function() {
    const json = get(this, 'resource.requestBody');

    return json && JSON.stringify(JSON.parse(json), undefined, 2);
  }),
  responseBody: computed('resource.responseBody', function() {
    const json = get(this, 'resource.responseBody');

    return json && JSON.stringify(JSON.parse(json), undefined, 2);
  }),
});
