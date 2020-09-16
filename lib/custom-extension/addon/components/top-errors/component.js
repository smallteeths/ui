import { later } from '@ember/runloop';
import Component from '@ember/component';
import layout from './template';
import { get, computed } from '@ember/object';

export default Component.extend({
  layout,
  errors: null,

  classNames:        ['banner', 'bg-error'],
  classNameBindings: ['errors.length::hide'],

  errorsDidChange: computed('errors.[]', function() {
    if ( get(this, 'errors.length') ) {
      later(() => {
        this.$().scrollIntoView();
      }, 100);
    }
  }),
});
