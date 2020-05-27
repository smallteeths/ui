import { inject as service } from '@ember/service';
import Component from '@ember/component';
import layout from './template';
import { get, set } from '@ember/object';

export default Component.extend({
  intl:         service(),

  layout,
  // props
  credentialList:       null,

  init() {
    this._super(...arguments);

    if (!get(this, 'credentialList') ) {
      set(this, 'credentialList', []);
    }
  },
  actions: {
    remove(item) {
      get(this, 'credentialList').removeObject(item);
    },
  },
});
