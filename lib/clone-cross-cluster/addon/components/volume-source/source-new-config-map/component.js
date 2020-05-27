import Component from '@ember/component';
import layout from './template';
import { get, set, observer, computed } from '@ember/object';
import VolumeSource from 'shared/mixins/volume-source';
import { inject as service } from '@ember/service';

export default Component.extend(VolumeSource, {
  modalService: service('modal'),

  layout,
  field:     'configMap',

  specific:    false,
  defaultMode: null,

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
    defineNewConfigMap(configMap) {
      get(this, 'modalService').toggleModal('custom-modal-edit-config-map', {
        done:          this.doneEditConfigMap.bind(this),
        model:         configMap,
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

  config: computed('field', 'configMap', function() {
    const volume = get(this, 'volume');
    const field = get(this, 'field');

    let config = get(volume, field);

    if ( !config ) {
      config = this.configForNew();
      set(volume, field, config);
    }
    if (this.configMap && this.configMap.name !== config.name) {
      set(config, 'name', this.configMap.name);
    }

    return config;
  }),

  doneEditConfigMap(configMap, originConfigMap) {
    set(this, 'volume.configMap.name', configMap.name);
    this.updateConfigMap(configMap, originConfigMap);
  }
});
