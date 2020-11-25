import { next } from '@ember/runloop';
import Component from '@ember/component';
import layout from './template';
import $ from 'jquery';
import { get } from '@ember/object';
import { inject as service } from '@ember/service';

export default Component.extend({
  router:                    service(),

  layout,

  didInsertElement() {
    next(() => {
      if ( this.isDestroyed || this.isDestroying ) {
        return;
      }

      if (get(this, 'router.currentRoute.queryParams.focus') === 'fluentdLogDir') {
        const elem = $('.fluentdLogDir')[0]

        if (elem) {
          setTimeout(() => {
            elem.focus();
          }, 250);
        }
      }
    });
  },
})
