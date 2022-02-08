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

  expanded: false,

  timer: null,

  connectStatus: null,
  connectMode:   null,

  errors: null,

  cluster: alias('scope.currentCluster'),

  didInsertElement() {
    this._super(...arguments);
    this.startTimer();
  },
  willDestroyElement() {
    this.stopTimer()
    this._super(...arguments);
  },

  timeout: computed('connectStatus.ClusterManagerState.RestConfig.Timeout', function() {
    const timeout = get(this, 'connectStatus.ClusterManagerState.RestConfig.Timeout');

    if ([undefined, null].includes(timeout)) {
      return '';
    }

    return Math.round(timeout / 10 ** 9);
  }),

  freshConnectModeAndStatus(signal) {
    const connectModeP = this.cluster.fetchClusterConnectMode(signal).then((resp) => {
      set(this, 'connectMode', resp.body)
    });
    const connectStatusP = this.cluster.fetchConnectStatus(signal)
      .then((resp) => {
        set(this, 'errors', null);
        let d = null;

        try {
          d = JSON.parse(resp.body);
        } catch (err) {
          return Promise.reject(resp.body);
        }

        set(this, 'connectStatus', d && d.length > 0 ? d[0] : null);
      });

    Promise.all([connectModeP, connectStatusP]).then(() => {
      const t = setTimeout(() => {
        this.freshConnectModeAndStatus(signal);
      }, 5000);

      set(this, 'timer', t);
    }).catch((err) => {
      if (err.name === 'AbortError') { // handle abort()
        return
      }
      if (typeof err === 'string') {
        set(this, 'errors', [err]);
      } else {
        set(this, 'errors', [err && err.body && err.body.message]);
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
