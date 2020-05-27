import { get, computed, set, setProperties } from '@ember/object';
import { alias } from '@ember/object/computed';
import Component from '@ember/component';
import ModalBase from 'shared/mixins/modal-base';
import layout from './template';
import { gt } from '@ember/object/computed';
import { parseSi } from 'shared/utils/parse-unit';
import { inject as service } from '@ember/service';

export default Component.extend(ModalBase, {
  intl:       service(),
  layout,
  classNames: ['large-modal'],
  model:      null,

  useStorageClass:   true,
  capacity:          null,
  titleKey:          'cruVolumeClaimTemplate.title',
  headerToken:       'cruPersistentVolumeClaim.add.new',

  namespace:       alias('modalService.modalOpts.namespace'),
  originalModel:   alias('modalService.modalOpts.model'),

  persistentVolumeClaims: alias('modalService.modalOpts.persistentVolumeClaims'),
  persistentVolumes:      alias('modalService.modalOpts.persistentVolumes'),
  storageClasses:         alias('modalService.modalOpts.storageClasses'),
  canUseStorageClass:     gt('storageClasses.length', 0),

  init() {
    this._super(...arguments);
    set(this, 'errors', null);

    const clone = get(this, 'originalModel').clone();

    setProperties(this, { model: clone });

    const capacity = get(this, 'clone.resources.requests.storage');

    if ( capacity ) {
      const bytes = parseSi(capacity);
      const gib = bytes / (1024 ** 3);

      set(this, 'capacity', gib);
    }

    if ( !get(this, 'canUseStorageClass')) {
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
      let label      = get(v, 'displayName');
      const state    = get(v, 'state');
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
    const mode = 'edit';
    const intl = get(this, 'intl');

    let name = get(this, 'originalModel.displayName')
            || '';

    return intl.t(`${ prefix }.${ mode }`, { name });
  }),

  validate() {
    set(this, 'errors', null)
    const pr = get(this, 'model');
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
