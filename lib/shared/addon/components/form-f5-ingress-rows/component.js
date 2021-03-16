import { get, set, computed, observer } from '@ember/object'
import Component from '@ember/component';
import layout from './template';

const BACKENDS_TYPES = [
  {
    label: 'TCP',
    value: 'tcp'
  },
  {
    label: 'HTTP',
    value: 'http'
  },
  {
    label: 'HTTPS',
    value: 'https'
  }
]

export default Component.extend({
  layout,

  enableMonitor: false,
  monitorCopy:   null,

  pool:    null,
  pools:   null,
  editing: null,

  isVirtualServer: null,

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

  poolsChanged: observer('pool.monitor.{interval,timeout,send,recv,type}', 'pool.rewrite', function() {
    const pools = get(this, 'pools');

    if (!this.pool.rewrite) {
      delete this.pool.rewrite;
    }

    if (get(this, 'enableMonitor') && !this.pool.monitor.timeout) {
      delete this.pool.monitor.timeout;
    }

    if (!this.pool.monitor) {
      delete this.pool.monitor;
    }

    set(this, 'f5.pools', pools);
  }),

  enableMonitorChanged: observer('enableMonitor', function() {
    const pool = get(this, 'pool');

    if (!get(this, 'enableMonitor')) {
      set(this, 'monitorCopy', pool.monitor);
      set(this, 'pool.monitor', null);
    } else {
      if (get(this, 'monitorCopy')) {
        set(this, 'pool.monitor', get(this, 'monitorCopy'));
      } else {
        set(this, 'pool.monitor', { type: get(this, 'isVirtualServer') ? 'http' : 'tcp' });
      }
    }
  }),

  monitorTypeChoices: computed('isVirtualServer', function() {
    const out = BACKENDS_TYPES.concat();

    if (!get(this, 'isVirtualServer')) {
      out.splice(1, 2);
    } else {
      out.shift();
    }

    return out;
  }),

  initPool() {
    if (get(this, 'pool.monitor.interval')) {
      set(this, 'enableMonitor', true);
    }
  },
});
