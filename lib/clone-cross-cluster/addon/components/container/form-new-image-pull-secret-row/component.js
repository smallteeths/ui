import { inject as service } from '@ember/service';
import Component from '@ember/component';
import layout from './template';
import { get, set, observer } from '@ember/object';

export default Component.extend({
  intl:         service(),

  layout,
  model:       null,
  statusClass: null,
  asArray:     null,

  init() {
    this._super(...arguments);
    const asArray = JSON.parse(JSON.stringify(get(this, 'model.asArray') || []));

    set(this, 'asArray', asArray);
    this.arrayChanged();
  },

  actions: {
    remove() {
      if (this.remove) {
        this.remove(this.model);
      }
    }
  },

  arrayChanged: observer('asArray.@each.{preset,address,username,password,auth}', function() {
    const registries = {};

    get(this, 'asArray').forEach((obj) => {
      let key = get(obj, 'address');
      const val = {};

      ['username', 'password', 'auth'].forEach((k) => {
        let v = get(obj, k);

        if ( v ) {
          val[k] = v;
        }
      });
      registries[key] = val;
    });

    set(this, 'model.registries', registries);
  }),
});
