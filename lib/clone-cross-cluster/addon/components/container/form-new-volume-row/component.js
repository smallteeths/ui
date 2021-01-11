import { inject as service } from '@ember/service';
import Component from '@ember/component';
import layout from './template';
import { get, set, computed } from '@ember/object';
import { alias } from '@ember/object/computed';

export default Component.extend({
  modalService: service('modal'),

  layout,
  tagName: '',

  pvcs: alias('persistentVolumeClaims'),

  actions: {
    defineNewVolume() {
      get(this, 'modalService').toggleModal('modal-new-volume', {
        model:    get(this, 'model.volume').clone(),
        callback: (volume) => {
          set(this, 'model.volume', volume);
        },
      });
    },

    defineNewPvc() {
      get(this, 'modalService').toggleModal('custom-modal-new-pvc', {
        model:                  get(this, 'model.pvc'),
        namespace:              get(this, 'namespace'),
        done:                   this.doneEditPersistentVolumeClaim.bind(this),
        persistentVolumes:      this.persistentVolumes,
        persistentVolumeClaims: this.persistentVolumeClaims,
        storageClasses:         this.storageClasses,
      });
    },

    defineNewVct() {
      const { modalService } = this;

      modalService.toggleModal('custom-modal-new-vct', {
        model:     get(this, 'model.vct'),
        namespace: get(this, 'namespace'),
        done:      (vct) => {
          set(this, 'model.vct', vct);

          if ( !get(this, 'model.name') ) {
            set(this, 'model.name', get(vct, 'name'));
          }
        },
        persistentVolumes:      this.persistentVolumes,
        persistentVolumeClaims: this.persistentVolumeClaims,
        storageClasses:         this.storageClasses,
      });
    },

    remove() {
      if (this.remove) {
        this.remove(this.model);
      }
    },

    addMount() {
      const mount = get(this, 'store').createRecord({
        type:          'volumeMount',
        containerName: this.containerName,
      })

      get(this, 'model.mounts').pushObject(mount);
    },

    removeMount(mount) {
      get(this, 'model.mounts').removeObject(mount);
    },
  },

  pvcChoices: computed('pvcs.@each.{name,state}', 'namespace.id', function() {
    return get(this, 'pvcs').filterBy('namespaceId', get(this, 'namespace.id'))
      .map((v) => {
        let label = get(v, 'displayName');
        const state = get(v, 'state');
        const disabled = false;

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

  mounts: computed('containerName', 'model.mounts.[]', function() {
    return this.model.mounts.filter((m) => m.containerName === this.containerName);
  }),

  doneEditPersistentVolumeClaim(pvc, originPvc) {
    this.updatePvc(pvc, originPvc);
    set(this, 'model.pvc', pvc);
    if ( !get(this, 'model.volume.name') ) {
      set(this, 'model.volume.name', get(pvc, 'name'));
    }
  },
});
