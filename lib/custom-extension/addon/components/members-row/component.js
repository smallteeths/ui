import Component from '@ember/component';
import layout from './template';
import { get, set } from '@ember/object';
export default Component.extend({
  layout,
  model:      null,
  isLocal:    null,

  tagName:    'TR',
  classNames: 'main-row',
});