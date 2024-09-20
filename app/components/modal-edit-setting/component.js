import { alias } from '@ember/object/computed';
import { next } from '@ember/runloop';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import { normalizeName } from 'shared/settings/service';
import ModalBase from 'shared/mixins/modal-base';
import layout from './template';
import { get, set, computed } from '@ember/object';
import $ from 'jquery';

const cmOpts = {
  autofocus:       true,
  gutters:          ['CodeMirror-lint-markers'],
  lineNumbers:     true,
  lineWrapping:    true,
  lint:            true,
  mode:            {
    name:          'javascript',
    json:          true,
  },
  theme:           'monokai',
  viewportMargin:   Infinity,
};

export default Component.extend(ModalBase, {
  settings:          service(),
  growl:             service(),
  layout,
  classNames:        ['modal-edit-setting', 'span-8', 'offset-2'],

  codeMirrorOptions: cmOpts,
  value:             null,
  formattedValue:    null,
  removing:          false,

  model: alias('modalService.modalOpts'),

  init() {
    this._super(...arguments);

    if (get(this, 'model.kind') === 'json') {
      let formattedValue = get(this, 'model.obj.value')

      try {
        formattedValue = JSON.stringify(JSON.parse(formattedValue), undefined, 2)
      } catch {
        // catch SyntaxError
      }

      set(this, 'formattedValue', formattedValue);
    } else {
      let val = get(this, 'model.obj.value') || ''

      if (get(this, 'model.unit') && get(this, 'model.kind') === 'int'){
        val = parseInt(val, 10) || 0;
      }
      set(this, 'value', val);
    }
  },

  didInsertElement() {
    next(() => {
      if ( this.isDestroyed || this.isDestroying ) {
        return;
      }

      const elem = $('.form-control')[0]

      if ( elem ) {
        setTimeout(() => {
          elem.focus();
        }, 250);
      }
    });
  },

  actions: {
    save(btnCb) {
      let value = this.value

      if (get(this, 'model.unit') && get(this, 'model.kind') === 'int'){
        value = value || 0;
        value += get(this, 'model.unit');
      }
      this.settings.set(normalizeName(get(this, 'model.key')), value);
      this.settings.one('settingsPromisesResolved', () => {
        btnCb(true);
        this.send('done');
      });
    },

    done() {
      this.send('cancel');
      window.location.href = window.location.href; // eslint-disable-line no-self-assign
    },

    updateJson(json) {
      set(this, 'value', json);
    }
  },

  disabled: computed('model.key', 'removing', 'value', function() {
    let urlReg = /(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?/;
    let subUrl = urlReg.exec( get(this, 'value') )
    let flag = subUrl && subUrl[0]

    if ( get(this, 'model.key') === 'auditlog-server-url' && get(this, 'value') ){
      return get(this, 'removing') || (!flag && get(this, 'model.key') === 'auditlog-server-url')
    }

    return get(this, 'removing')
  }),
});
