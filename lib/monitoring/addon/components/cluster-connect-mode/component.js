import Component from '@ember/component';
import layout from './template';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import { get, set, computed } from '@ember/object';
import { next } from '@ember/runloop';



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

  connectStatusErrors: null,
  connectModeErrors:   null,

  cluster: alias('scope.currentCluster'),

  didInsertElement() {
    this._super(...arguments);
    this.startTimer();
  },
  willDestroyElement() {
    this.stopTimer()
    this._super(...arguments);
  },

  actions: {
    showEditModal() {
      this.fetchClusterConnectMode().then((resp) => {
        const d = resp.body;

        this.modalService.toggleModal('modal-edit-connect-mode', {
          cluster:  this.cluster,
          model:    d,
          callback: (data, restart = false) => {
            if (restart) {
              next(() => {
                this.modalService.toggleModal('modal-confirm-restart-controller', {
                  cluster:       this.cluster,
                  action:        () => {
                    this.confirmSaveAndRestart(data, true);
                  },
                });
              });

              return;
            }
            this.confirmSaveAndRestart(data, false);
          },
        });
      });
    }
  },

  timeout: computed('connectStatus.ClusterManagerState.RestConfig.Timeout', function() {
    const timeout = get(this, 'connectStatus.ClusterManagerState.RestConfig.Timeout');

    if ([undefined, null].includes(timeout)) {
      return '';
    }

    return Math.round(timeout / 10 ** 9);
  }),

  confirmSaveAndRestart(data, restart = false) {
    this.globalStore.rawRequest({
      url:     `/v3/clusters/${ this.cluster.id }?action=editConnectionConfig`,
      method:  'post',
      data,
    }).then(() => {
      if (restart) {
        return this.globalStore.rawRequest({
          url:     `/mcm/restart/${ this.cluster.id }`,
          method:  'get',
        });
      }
    }).catch((err) => {
      this.growl.fromError(err && err.body && err.body.message);
    }).finally(() => {
      this.stopTimer();
      this.startTimer();
    });
  },
  fetchConnectStatus(signal) {
    return this.globalStore.rawRequest({
      url:     `/mcm/show/${ this.cluster.id }`,
      method:  'get',
      signal,
    });
  },
  fetchClusterConnectMode(signal) {
    return this.globalStore.rawRequest({
      url:     `/v3/clusters/${ this.cluster.id }?action=viewConnectionConfig`,
      method:  'post',
      signal,
    });
  },
  freshConnectModeAndStatus(signal) {
    const connectModeP = this.fetchClusterConnectMode(signal).then((resp) => {
      set(this, 'connectMode', resp.body)
    }).catch((err) => {
      set(this, 'connectModeErrors', [err && err.body && err.body.message]);
    });
    const connectStatusP = this.fetchConnectStatus(signal)
      .then((resp) => {
        set(this, 'errors', null);
        const d = JSON.parse(resp.body);

        set(this, 'connectStatus', d && d.length > 0 ? d[0] : null);
      }).catch((err) => {
        set(this, 'connectStatusErrors', [err && err.body && err.body.message]);
      });

    Promise.all([connectModeP, connectStatusP]).then(() => {
      const t = setTimeout(() => {
        this.freshConnectModeAndStatus();
      }, 5000);

      set(this, 'timer', t);
    }).catch((err) => {
      if (err.name === 'AbortError') { // handle abort()
        return
      }
      const t = setTimeout(() => {
        this.freshConnectModeAndStatus();
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
