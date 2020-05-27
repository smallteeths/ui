import { scheduleOnce } from '@ember/runloop';
import Component from '@ember/component';
import ModalBase from 'shared/mixins/modal-base';
import layout from './template';
import { alias } from '@ember/object/computed';
import { get, set, computed, setProperties } from '@ember/object';
import { inject as service } from '@ember/service';
import { validateCertWeakly, validateKeyWeakly } from 'shared/utils/util';

export default Component.extend(ModalBase, {
  intl: service(),

  layout,
  model:          null,
  namespacedType: 'namespacedCertificate',
  projectType:    'certificate',
  titleKey:       'newCertificate.title',

  namespace:       alias('modalOpts.namespace'),
  originalModel:   alias('modalOpts.model'),

  init() {
    this._super(...arguments);
    set(this, 'errors', null);

    const clone = get(this, 'originalModel').clone();

    setProperties(this, {
      clone,
      model: clone,
    })

    scheduleOnce('afterRender', () => {
      this.$('INPUT')[0].focus();
    });
  },
  actions: {
    updateData(map) {
      set(this, 'model.data', map);
    },
    save(cb) {
      const ok = this.validate();

      if (!ok) {
        cb(false);

        return;
      }
      cb(true);
      get(this, 'modalOpts.done')(this.model, this.originalModel);
      this.send('close');
    },
  },
  isEncrypted: computed('model.key', function() {
    var key = get(this, 'model.key') || '';

    return key.match(/^Proc-Type: 4,ENCRYPTED$/m) || key.match(/^-----BEGIN ENCRYPTED.* KEY-----$/m);
  }),
  scope: computed('originalModel', function() {
    if (get(this, 'originalModel.type') === 'namespacedSecret') {
      return 'namespace';
    }

    return 'project';
  }),
  title: computed('originalModel.displayName', 'titleKey', function() {
    const prefix = get(this, 'titleKey');
    const mode = 'edit';
    const intl = get(this, 'intl');

    let name = get(this, 'originalModel.displayName')
            || '';

    return intl.t(`${ prefix }.${ mode }`, { name });
  }),
  validate() {
    set(this, 'errors', null)
    var model = get(this, 'model');
    var errors = model.validationErrors();

    if ( errors.get('length') ) {
      set(this, 'errors', errors);
    }

    var intl = get(this, 'intl');

    if (get(this, 'isEncrypted')) {
      errors.push(intl.t('newCertificate.errors.encrypted'));
    }

    const key = get(this, 'model.key');

    if ( key ) {
      if ( !validateKeyWeakly(key) ) {
        errors.push(intl.t('newCertificate.errors.key.invalidFormat'));
      }
    } else {
      errors.push(intl.t('newCertificate.errors.key.required'));
    }

    const certs = get(this, 'model.certs');

    if ( certs ) {
      if ( !validateCertWeakly(certs) ) {
        errors.push(intl.t('newCertificate.errors.cert.invalidFormat'));
      }
    } else {
      errors.push(intl.t('newCertificate.errors.cert.required'));
    }

    set(this, 'errors', errors);

    return get(this, 'errors.length') === 0;
  },
});
