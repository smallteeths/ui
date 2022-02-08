import { inject as service } from '@ember/service';
import Component from '@ember/component';
import layout from './template';

export default Component.extend({
  intl:                service(),
  scope:               service(),

  editing: false,
  layout,

  init() {
    this._super(...arguments);
  },
});
