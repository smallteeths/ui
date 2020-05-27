import Component from '@ember/component';
import layout from './template';
import { get, set, observer, computed } from '@ember/object';
import VolumeSource from 'shared/mixins/volume-source';
import { inject as service } from '@ember/service';

export default Component.extend(VolumeSource, {
  modalService: service('modal'),

  layout,
  field:     'secret',

  specific:    false,
  defaultMode: null,
  editing:     true,

  didReceiveAttrs() {
    this._super(...arguments);
    if (!!get(this, 'config.items')) {
      set(this, 'specific', true);
    }

    const modeStr = get(this, 'config.defaultMode');

    if ( modeStr ) {
      set(this, 'defaultMode', (new Number(modeStr)).toString(8));
    } else {
      set(this, 'defaultMode', '400');
    }
  },

  actions: {
    defineNewSecret(secret) {
      get(this, 'modalService').toggleModal('custom-modal-edit-secret', {
        done:          this.doneEditSecret.bind(this),
        model:         secret,
        namespace:     this.targetNamespace || this.namespace
      });
    }
  },

  specificDidChange: observer('specific', function() {
    if (!get(this, 'specific')){
      set(this, 'config.items', null);
    }
  }),

  modeDidChange: observer('defaultMode', function() {
    const octal = get(this, 'defaultMode') || '0';

    set(this, 'config.defaultMode', parseInt(octal, 8));
  }),

  config: computed('field', 'secret', function() {
    const volume = get(this, 'volume');
    const field = get(this, 'field');

    let config = get(volume, field);

    if ( !config ) {
      config = this.configForNew();
      set(volume, field, config);
    }
    if (this.secret && this.secret.name !== config.secretName) {
      set(config, 'secretName', this.secret.name);
    }

    return config;
  }),

  doneEditSecret(secret, originSecret) {
    set(this, 'volume.secret.secretName', secret.name);
    this.updateSecret(secret, originSecret);
  }
});
