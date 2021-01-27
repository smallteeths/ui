import { get, set, observer } from '@ember/object'
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import layout from './template';

const TARGET = 'f5.cattle.io/targets';

export default Component.extend({
  intl: service(),

  layout,
  f5: null,

  isVirtualServer: null,

  pools:   null,
  editing: null,
  mode:    null,

  init() {
    this._super(...arguments);
    this.initPools();
  },

  actions: {
    addPool() {
      const pool = { isNew: true };

      get(this, 'pools').pushObject(pool);
    },

    removePool(pool) {
      get(this, 'pools').removeObject(pool);
    },
  },

  isVirtualServerChanged: observer('isVirtualServer', 'pools.[]', function() {
    const f5Pools = get(this, 'f5.pools');
    const pools = get(this, 'pools');

    if (get(this, 'isVirtualServer') || pools.length <= 1) {
      return;
    }

    set(this, 'pools', [get(pools, 'firstObject')]);

    const a = get(this, 'f5.annotations') || {};

    if (!a[TARGET]) {
      return;
    }

    const key = `${ get(f5Pools, 'firstObject.service') }/${ get(f5Pools, 'firstObject.servicePort') }`;
    const value = JSON.parse(a[TARGET])[key];

    if (value) {
      a[TARGET] = JSON.stringify({ [key]: value });
    } else {
      delete a[TARGET];
    }

    set(this, 'f5.annotations', a);
  }),

  poolsLengthChanged: observer('pools.[]', function() {
    // we should remove extra annotations after a pool was removed
    const a = get(this, 'f5.annotations') || {};
    const pools = get(this, 'pools');
    const out = {};

    if (!a[TARGET]) {
      return;
    }

    const serial = JSON.parse(a[TARGET])

    Object.keys(serial).forEach((key) => {
      if (pools.find((p) => !!serial[`${ p.serviceId }/${ p.servicePort }`])) {
        out[key] = serial[key]
      }
    });

    a[TARGET] = JSON.stringify(out);
    set(this, 'f5.annotations', a);
  }),

  poolsChanged: observer('pools.@each.{rewrite,service,servicePort,path}', function() {
    const pools = get(this, 'pools');

    set(this, 'f5.pools', pools);
  }),
  initPools() {
    let pools = [];

    (get(this, 'f5.pools') || []).forEach((pool) => {
      pools.push(pool);
    });

    set(this, 'pools', pools);

    if (get(this, 'mode') === 'new') {
      this.send('addPool');
    }
  },

});
