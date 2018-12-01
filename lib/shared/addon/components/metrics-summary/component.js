import { on } from '@ember/object/evented';
import Component from '@ember/component';
import layout from './template'
import { inject as service } from '@ember/service'
import { get, set, observer } from '@ember/object'
import { run } from '@ember/runloop';

export default Component.extend({
  scope:       service(),
  globalStore: service(),

  layout,
  classNames:   ['metrics-summary'],

  title:        null,

  intent:       null,
  expanded:     false,
  everExpanded: false,

  actions: {
    doExpand() {
      set(this, 'expanded', !get(this, 'expanded'));
    },
  },

  expdObserver: on('init', observer('expanded', function() {
    if (get(this, 'expanded') && !get(this, 'intent')) {
      if (!get(this, 'everExpanded')) {
        set(this, 'everExpanded', true);
      }

      run.next(() => {
        if ( this.isDestroyed || this.isDestroying ) {
          return;
        }

        set(this, 'intent', get(this, 'componentName'));
      });
    }
  })),
});
