import Component from '@ember/component';
import layout from './template';
import { get, set, observer, computed } from '@ember/object';
import VolumeSource from 'shared/mixins/volume-source';
import { inject as service } from '@ember/service';

export default Component.extend(VolumeSource, {
  settings: service(),

  layout,
  field: 'configMap',

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

  specificDidChange: observer('specific', function() {
    if (!this.specific){
      set(this, 'config.items', null);
    }
  }),

  modeDidChange: observer('defaultMode', function() {
    const octal = this.defaultMode || '0';

    set(this, 'config.defaultMode', parseInt(octal, 8));
  }),

  configNameDidChange: observer('config.name', function() {
    set(this, 'specific', false);
  }),

  namespaceDidChange: observer('namespace.id', function() {
    set(this, 'config.name', '');
  }),

  enableLoadResourceByNamespace: computed('settings.enable-load-resource-by-namespace', function() {
    return get(this, 'settings.enable-load-resource-by-namespace');
  }),
});
