import C from 'ui/utils/constants';
import { inject as service } from '@ember/service';
import { computed, get, set } from '@ember/object';
import Component from '@ember/component';
import layout from './template';

export const NEW_VOLUME = 'newVolume';
export const NEW_PVC = 'newPvc';
export const NEW_VCT = 'newVolumeClaimTemplate';

export const EXISTING_VOLUME = 'existingVolume';
export const EXISTING_PVC = 'existingPvc';
export const EXISTING_VCT = 'existingVct';

export const LOG_AGGREGATOR = 'cattle.io/log-aggregator'

export default Component.extend({
  intl:          service(),
  scope:         service(),
  modalService:  service('modal'),
  layout,
  classNames:    ['accordion-wrapper'],

  // Inputs
  namespace:       null,
  targetNamespace: null,
  errors:          null,
  scaleMode:       null,
  nextNum:         1,
  volumesArray:    null,
  newVolumesArray: null,

  init() {
    this._super(...arguments);
    this.initVolumes();
  },

  // Create (ephermal) Volume -> volume entry on pod
  // Create PVC for existing (persistent) volume // cru-pvc
  // Create PVC for a new volume via storageclass // cru-pvc
  // Use an existing PVC (from the project volumes page)
  // Bind-mount (ephemeral volume -> hostPath)
  // Tmpfs (ephemeral volume -> emptyDir -> backing=memory)

  actions: {
    remove(obj) {
      get(this, 'volumesArray').removeObject(obj);
    },

    removeNew(obj) {
      get(this, 'newVolumesArray').removeObject(obj);
    },

    addVolume(dd) {
      const store = get(this, 'store');

      const v = {
        mode:   NEW_VOLUME,
        volume: store.createRecord({
          type: 'volume',
          name: this.nextName(),
        }),
        mounts: [
          get(this, 'store').createRecord({
            type:          'volumeMount',
            containerName: this.containerName,
          })
        ],
      };

      get(this, 'volumesArray').pushObject(v);
      dd.actions.close();
    },

    addNewPvc(dd) {
      const store = get(this, 'store');

      const v = {
        mode:   NEW_PVC,
        pvc:    store.createRecord({
          type:        'persistentVolumeClaim',
          projectId:   this.targetProjectId,
          namespaceId: this.targetNamespace.id,
        }),
        name:   null,
        volume: store.createRecord({
          type:                  'volume',
          persistentVolumeClaim: store.createRecord({
            type:                    'persistentVolumeClaimVolumeSource',
            persistentVolumeClaimId: null,
          }),
        }),
        mounts: [
          store.createRecord({
            type:          'volumeMount',
            containerName: this.containerName,
          })
        ],
      };

      get(this, 'volumesArray').pushObject(v);
      dd.actions.close();
    },

    addPvc(dd) {
      const store = get(this, 'store');

      get(this, 'volumesArray').pushObject({
        mode:   EXISTING_PVC,
        volume: store.createRecord({
          type:                  'volume',
          name:                  this.nextName(),
          persistentVolumeClaim: store.createRecord({
            type:                    'persistentVolumeClaimVolumeSource',
            persistentVolumeClaimId: null,
          }),
        }),
        mounts: [
          store.createRecord({
            type:          'volumeMount',
            containerName: this.containerName,
          }),
        ],
      });
      dd.actions.close();
    },

    addBindMount(dd) {
      const store = get(this, 'store');

      get(this, 'volumesArray').pushObject({
        mode:   C.VOLUME_TYPES.BIND_MOUNT,
        volume: store.createRecord({
          type:     'volume',
          name:     this.nextName(),
          hostPath: store.createRecord({
            type: 'hostPathVolumeSource',
            kind: '',
            path: '',
          }),
        }),
        mounts: [
          store.createRecord({
            type:          'volumeMount',
            containerName: this.containerName
          })
        ],
      });
      dd.actions.close();
    },

    addTmpfs(dd) {
      const store = get(this, 'store');

      get(this, 'volumesArray').pushObject({
        mode:   C.VOLUME_TYPES.TMPFS,
        volume: store.createRecord({
          type:     'volume',
          name:     this.nextName(),
          emptyDir: store.createRecord({
            type:   'emptyDirVolumeSource',
            medium: 'Memory',
          }),
        }),
        mounts: [
          store.createRecord({
            type:          'volumeMount',
            containerName: this.containerName
          })
        ],
      });
      dd.actions.close();
    },

    addConfigMap(dd) {
      const store = get(this, 'store');

      get(this, 'volumesArray').pushObject({
        mode:   C.VOLUME_TYPES.CONFIG_MAP,
        volume: store.createRecord({
          type:      'volume',
          name:      this.nextName(),
          configMap: store.createRecord({
            type:        'configMapVolumeSource',
            defaultMode: 256,
            name:        null,
            optional:    false,
          }),
        }),
        mounts: [
          store.createRecord({
            type:          'volumeMount',
            containerName: this.containerName
          })
        ],
      });
      dd.actions.close();
    },

    addSecret(dd) {
      const store = get(this, 'store');

      get(this, 'volumesArray').pushObject({
        mode:   C.VOLUME_TYPES.SECRET,
        volume: store.createRecord({
          type:   'volume',
          name:   this.nextName(),
          secret: store.createRecord({
            type:        'secretVolumeSource',
            defaultMode: 256,
            secretName:  null,
            optional:    false,
          }),
        }),
        mounts: [
          store.createRecord({
            type:          'volumeMount',
            containerName: this.containerName,
          })
        ],
      });
      dd.actions.close();
    },

    addCertificate(dd) {
      const store = get(this, 'store');

      get(this, 'volumesArray').pushObject({
        mode:   C.VOLUME_TYPES.CERTIFICATE,
        volume: store.createRecord({
          type:   'volume',
          name:   this.nextName(),
          secret: store.createRecord({
            type:        'secretVolumeSource',
            defaultMode: 256,
            secretName:  null,
            optional:    false,
          }),
        }),
        mounts: [
          store.createRecord({
            type:          'volumeMount',
            containerName: this.containerName,
          })
        ],
      });
      dd.actions.close();
    },

    addCustomLogPath(dd) {
      const store = get(this, 'store');

      const name = this.nextName();

      get(this, 'volumesArray').pushObject({
        mode:   C.VOLUME_TYPES.CUSTOM_LOG_PATH,
        volume: store.createRecord({
          type:       'volume',
          name,
          flexVolume: store.createRecord({
            type:    'flexVolume',
            driver:  LOG_AGGREGATOR,
            fsType:  'ext4',
            options: {
              format:      'json',
              clusterName: get(this, 'cluster.name'),
              projectName: get(this, 'project.name'),
              clusterId:   get(this, 'cluster.id'),
              projectId:   get(this, 'project.id').split(':')[1],
              volumeName:  name,
            },
          }),
        }),
        mounts: [
          store.createRecord({
            type:          'volumeMount',
            containerName: this.containerName,
          }),
        ],
      });
      dd.actions.close();
    },

    addVolumeClaimTemplate(dd) {
      const { store, volumesArray } = this;

      const vct = store.createRecord({
        type: 'persistentVolumeClaim',
        name: this.nextName(),

        projectId:   this.targetProjectId,
        namespaceId: this.targetNamespace.id,
      });
      const v = {
        mode:   NEW_VCT,
        vct,
        mounts: [
          store.createRecord({
            type:          'volumeMount',
            containerName: this.containerName,
          }),
        ],
      };

      volumesArray.pushObject(v);
      dd.actions.close();
    }
  },

  isStatefulSet: computed('scaleMode', function() {
    const { scaleMode } = this;

    return scaleMode === 'statefulSet';
  }),

  isWindows:  computed('cluster.windowsPreferedCluster', function() {
    return !!get(this, 'cluster.windowsPreferedCluster');
  }),

  initVolumes() {
    if (!get(this, 'expandFn')) {
      set(this, 'expandFn', (item) => {
        item.toggleProperty('expanded');
      });
    }
  },

  getSecretType(secretName) {
    const store = get(this, 'store');
    let found = store.all('secret').findBy('name', secretName);

    if ( found ) {
      if ( get(found, 'type') === C.VOLUME_TYPES.CERTIFICATE ) {
        return C.VOLUME_TYPES.CERTIFICATE;
      }
    } else {
      found = store.all('namespacedSecret').findBy('type', secretName);
      if ( found && get(found, 'type') === 'namespacedCertificate' ) {
        return C.VOLUME_TYPES.CERTIFICATE;
      }
    }

    return C.VOLUME_TYPES.SECRET;
  },

  nextName() {
    const volumes = [...this.newVolumesArray, ...this.volumesArray];
    let num = get(this, 'nextNum');
    let name;

    let ok = false;

    while (!ok) {
      name = `vol${  num }`;
      ok = !volumes.findBy('name', name);
      num++;
    }

    set(this, 'nextNum', num);

    return name;
  },
});
