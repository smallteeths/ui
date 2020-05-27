import Component from '@ember/component';
import layout from './template';
import { get, set, observer } from '@ember/object';
import VolumeSource from 'shared/mixins/volume-source';
import { inject as service } from '@ember/service';

export default Component.extend(VolumeSource, {
  modalService: service('modal'),

  layout,
  field:     'secret',

  defaultMode: null,
  editing:     true,

  didReceiveAttrs() {
    this._super(...arguments);

    const modeStr = get(this, 'config.defaultMode');

    if ( modeStr ) {
      set(this, 'defaultMode', (new Number(modeStr)).toString(8));
    } else {
      set(this, 'defaultMode', '400');
    }
  },

  actions: {
    defineNewCertificate(cert) {
      get(this, 'modalService').toggleModal('custom-modal-edit-certificate', {
        done:          this.doneEditCert.bind(this),
        model:         cert,
        namespace:     this.targetNamespace || this.namespace
      });
    }
  },

  modeDidChange: observer('defaultMode', function() {
    const octal = get(this, 'defaultMode') || '0';

    set(this, 'config.defaultMode', parseInt(octal, 8));
  }),

  doneEditCert(cert, originCert) {
    set(this, 'volume.secret.secretName', cert.name);
    this.updateSecret(cert, originCert);
  }
});
