import { alias } from '@ember/object/computed';
import Component from '@ember/component';
import ModalBase from 'shared/mixins/modal-base';
import layout from './template';
import { inject as service } from '@ember/service';
import { set } from '@ember/object';


export default Component.extend(ModalBase, {
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

  loading: false,

  errors: null,

  testSuccess: false,

  callback: alias('modalService.modalOpts.callback'),
  model:    alias('modalService.modalOpts.model'),

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
      set(this, 'loading', true);
      this.globalStore.rawRequest({
        url:    `/v3/clusters/${ this.model.clusterID }?action=validateConnectionConfig`,
        method: 'post',
        data:   this.model,
      }).then(() => {
        set(this, 'errors', null);
        set(this, 'testSuccess', true);
      }).catch((err) => {
        set(this, 'testSuccess', false);
        set(this, 'errors', [err && err.body && err.body.message]);
      }).finally(() => {
        set(this, 'loading', false)
      })
    },
  },
});
