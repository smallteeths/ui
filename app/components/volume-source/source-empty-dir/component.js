import Component from '@ember/component';
import layout from './template';
import VolumeSource from 'shared/mixins/volume-source';
import { get, set, computed } from '@ember/object';

export default Component.extend(VolumeSource, {
  layout,
  field: 'emptyDir',

  initValue: { medium: '' },

  config: computed('field', 'volume', function() {
    const volume = get(this, 'volume');
    const field = get(this, 'field');

    let config = get(volume, field);

    if ( !config ) {
      config = this.configForNew();
      set(volume, field, config);
    } else if (!config.medium) {
      set(config, 'medium', '');
    }

    return config;
  }),

});
