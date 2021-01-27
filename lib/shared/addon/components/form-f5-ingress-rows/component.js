import { get, set, computed, observer } from '@ember/object'
import Component from '@ember/component';
import layout from './template';
import { inject as service } from '@ember/service';
import C from 'shared/utils/constants';
import { alias } from '@ember/object/computed';

const BACKENDS_TYPES = [
  {
    label: 'TCP',
    value: 'tcp'
  },
  {
    label: 'HTTP',
    value: 'http'
  }
]

export default Component.extend({
  layout,

  enableMonitor: false,

  monitorTypeChoices: BACKENDS_TYPES,

  pool:    null,
  pools:   null,
  editing: null,

  init() {
    this._super(...arguments);

    this.initPool()
  },

  actions: {
    removePool(pool) {
      if (this.removePool) {
        this.removePool(pool);
      }
    },
  },

  poolsChanged: observer('pool.monitor.{interval,timeout,send,recv,type}', function() {
    const pools = get(this, 'pools');

    // set(this, 'pool.send', get(this, 'pool.send2'));
    // set(this, 'pool.type', get(this, 'pool.type2'));
    set(this, 'f5.pools', pools);
  }),

  enableMonitorChanged: observer('enableMonitor', function() {
    const pool = get(this, 'pool');

    if (!get(this, 'enableMonitor')) {
      delete pool['monitor'];
      set(this, 'pool', pool);
    } else {
      set(this, 'pool.monitor', { type: 'tcp' });
    }
  }),

  initPool() {
    if (get(this, 'pool.monitor.interval')) {
      set(this, 'enableMonitor', true);
    }

    if (get(this, 'mode') === 'new') {
      return;
    }

    // set(this, 'pool.send2', get(this, 'pool.send'));
    // set(this, 'pool.type2', get(this, 'pool.type'));
  },
});
