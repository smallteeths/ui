import Component from '@ember/component';
import layout from './template';

export default Component.extend({
  layout,

  classNames: 'col span-3',
  label:      null,
  healthy:    null,
  url:        null,
});
