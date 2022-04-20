import { alias } from '@ember/object/computed';
import Component from '@ember/component';
import ModalBase from 'shared/mixins/modal-base';
import layout from './template';
import { inject as service } from '@ember/service';
import { set, get } from '@ember/object';

export default Component.extend(ModalBase, {
  intl:         service(),
  globalStore:  service(),
  modalService: service('modal'),
  layout,

  classNames: ['large-modal'],

  connectModes: [
    {
      label: 'Tunnel',
      value: 'false',
    }, {
      label: 'Tunnel & Direct',
      value: 'true',
    }
  ],
  timeoutSeconds: 10,
  initValues:     null,

  loading: false,

  errors: null,

  statusMap: null,

  testSuccess: false,

  callback: alias('modalService.modalOpts.callback'),
  model:    alias('modalService.modalOpts.model'),

  init() {
    this._super(...arguments);
    const apiEndpoints = get(this, 'model.apiEndpoints');

    if (apiEndpoints) {
      set(this, 'initValues', apiEndpoints);
      const statusMap = (get(this, 'model.endpointStatus') || []).reduce((t, c, i) => {
        t[apiEndpoints[i]] = c

        return t;
      }, {});

      set(this, 'statusMap', statusMap);
    }
  },

  actions: {
    doSave() {
      let callback = this.get('callback');

      if ( callback ) {
        callback(this.get('model'));
      }

      this.send('cancel');
    },
    doSaveAndRestart() {
      let callback = this.get('callback');

      if ( callback ) {
        callback(this.get('model'), true);
      }

      this.send('cancel');
    },
    testConnectMode() {
      set(this, 'statusMap', null);

      if (!this.validate()) {
        return;
      }
      set(this, 'loading', true);

      const apiEndpoints = [...(get(this, 'model.apiEndpoints') || [])];

      this.globalStore.rawRequest({
        url:    `/v3/clusters/${ this.model.clusterID }?action=validateConnectionConfig`,
        method: 'post',
        data:   this.model,
      }).then((resp) => {
        if (resp.body.endpointStatus && resp.body.endpointStatus.some((item) => !item.status)) {
          set(this, 'errors', [...new Set(resp.body.endpointStatus.filter((item) => !item.status).map((item) => item.error))]);
          set(this, 'testSuccess', false);
        } else {
          set(this, 'errors', null);
          set(this, 'testSuccess', true);
        }

        const statusMap = (resp.body.endpointStatus || []).reduce((t, c, i) => {
          t[apiEndpoints[i]] = c

          return t;
        }, {});

        set(this, 'statusMap', statusMap);
      }).catch((err) => {
        set(this, 'testSuccess', false);
        set(this, 'errors', [err && err.body && err.body.message]);
      }).finally(() => {
        set(this, 'loading', false)
      })
    },
  },

  validate() {
    if ((get(this, 'model.apiEndpoints') || []).length === 0) {
      set(this, 'errors', [this.intl.t('clusterConnectMode.apiEndpoint.required')]);

      return false;
    }

    if ((get(this, 'model.apiEndpoints') || []).some((item) => !item.trim())) {
      set(this, 'errors', [this.intl.t('clusterConnectMode.apiEndpoint.required')]);

      return false;
    }

    return true;
  }
});
