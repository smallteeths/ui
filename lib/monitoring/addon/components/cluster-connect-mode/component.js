import Component from '@ember/component';
import layout from './template';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import { get, set, computed } from '@ember/object';

export default Component.extend({
  globalStore:  service(),
  modalService: service('modal'),
  scope:        service(),
  growl:        service(),
  layout,

  gutters:        ['CodeMirror-lint-markers'],
  viewportMargin: Infinity,
  expanded:       false,
  timer:          null,
  connectMode:    null,
  errors:         null,

  cluster: alias('scope.currentCluster'),

  didInsertElement() {
    this._super(...arguments);
    this.startTimer();
  },
  willDestroyElement() {
    this.stopTimer()
    this._super(...arguments);
  },

  timeout: computed('connectMode.timeout', function() {
    const timeout = get(this, 'connectMode.timeout');

    if ([undefined, null].includes(timeout)) {
      return '';
    }

    return Math.round(timeout / 10 ** 9);
  }),

  statusMap: computed('connectMode.endpointStatus', 'connectMode.apiEndpoints', function() {
    const apiEndpoints = get(this, 'connectMode.apiEndpoints') || [];

    return (get(this, 'connectMode.endpointStatus') || []).reduce((t, c, i) => {
      t[apiEndpoints[i]] = c

      return t;
    }, {});
  }),

  freshConnectModeAndStatus(signal) {
    let p;

    if (this.isDestroyed || this.isDestroying) {
      p = Promise.reject({ name: 'AbortError' });
    } else if (!this.cluster) {
      p = Promise.resolve();
    } else {
      const connectModeP = this.cluster.fetchClusterConnectMode(signal).then((resp) => {
        set(this, 'connectMode', resp.body)
      });

      p = connectModeP;
    }

    p.then(() => {
      const t = setTimeout(() => {
        this.freshConnectModeAndStatus(signal);
      }, 5000);

      set(this, 'timer', t);
      set(this, 'errors', []);
    }).catch((err) => {
      if (err.name === 'AbortError') { // handle abort()
        return
      }
      if (typeof err === 'string') {
        set(this, 'errors', [err]);
      } else {
        set(this, 'errors', [err && (err.message || (err.body && err.body.message))]);
      }
      const t = setTimeout(() => {
        this.freshConnectModeAndStatus(signal);
      }, 5000);

      set(this, 'timer', t);
    });
  },
  startTimer() {
    const controller = new AbortController();

    if (this.abortController) {
      this.abortController.abort();
    }
    set(this, 'abortController', controller);
    this.freshConnectModeAndStatus(controller.signal)
  },
  stopTimer() {
    clearTimeout(this.timer);
    set(this, 'timer', null);
    if (this.abortController) {
      this.abortController.abort();
      set(this, 'abortController', null);
    }
  },
});
