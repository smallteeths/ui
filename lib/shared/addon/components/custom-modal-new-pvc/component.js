import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import Component from '@ember/component';
import ModalBase from 'shared/mixins/modal-base';
import layout from './template';
import { gt } from '@ember/object/computed';
import { get, set, computed, setProperties } from '@ember/object';
import { parseSi } from 'shared/utils/parse-unit';

export default Component.extend(ModalBase, {
  intl:       service(),
  layout,
  classNames: ['large-modal'],

  capacity: null,
  model:    null,
  mode:     'new',

  useStorageClass: true,

  titleKey:    'cruPersistentVolumeClaim.title',

  namespace: alias('modalService.modalOpts.namespace'),

  originalModel: alias('modalService.modalOpts.model'),

  persistentVolumeClaims: alias('modalService.modalOpts.persistentVolumeClaims'),
  persistentVolumes:      alias('modalService.modalOpts.persistentVolumes'),
  storageClasses:         alias('modalService.modalOpts.storageClasses'),
  canUseStorageClass:     gt('storageClasses.length', 0),
  init() {
    this._super(...arguments);
    const clone = get(this, 'originalModel').clone();

    setProperties(this, { model: clone });
    const capacity = get(this, 'model.resources.requests.storage');

    if ( capacity ) {
      const bytes = parseSi(capacity);
      const gib = bytes / (1024 ** 3);

      set(this, 'capacity', gib);
    }

    if ( !get(this, 'canUseStorageClass') || (!get(this, 'model.storageClassId') && get(this, 'model.volumeId'))) {
      set(this, 'useStorageClass', false);
    }
  },

  actions: {
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

  persistentVolumeChoices: computed('persistentVolumes.@each.{name,state}', function() {
    return get(this, 'persistentVolumes').map((v) => {
      let label = get(v, 'displayName');
      const state = get(v, 'state');
      const disabled = state !== 'available';

      if ( disabled ) {
        label += ` (${  state  })`;
      }

      return {
        label,
        disabled,
        value: get(v, 'id'),
      }
    })
      .sortBy('label');
  }),

  title: computed('originalModel.displayName', 'titleKey', function() {
    const prefix = get(this, 'titleKey');
    const mode = 'new';
    const intl = get(this, 'intl');

    return intl.t(`${ prefix }.${ mode }`);
  }),

  validate() {
    set(this, 'errors', null)
    var pr = get(this, 'model');
    const intl = get(this, 'intl');
    var errors = pr.validationErrors();

    if ( get(this, 'useStorageClass') ) {
      set(pr, 'volumeId', null);

      const capacity = get(this, 'capacity');

      if ( capacity ) {
        set(pr, 'resources', { requests: { storage: `${ capacity  }Gi`, } });
      } else {
        const errors = [];

        errors.push(intl.t('validation.required', { key: intl.t('cruPersistentVolumeClaim.capacity.label') }));
        set(this, 'errors', errors);

        return false;
      }
    } else {
      set(pr, 'storageClassId', get(pr, 'persistentVolume.storageClassId') || null);
      set(pr, 'resources', { requests: Object.assign({}, get(pr, 'persistentVolume.capacity')), });
    }

    if ( errors.get('length') ) {
      set(this, 'errors', errors);
    }

    return errors.length === 0;
  },
});
