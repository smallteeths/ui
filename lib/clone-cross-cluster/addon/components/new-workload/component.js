import Component from '@ember/component';
import { inject as service } from '@ember/service';
import {
  get, set, computed, observer, setProperties
} from '@ember/object';
import { alias } from '@ember/object/computed';
import C from 'ui/utils/constants';
import Errors from 'ui/utils/errors';

const NEW_PVC = 'newPvc';
const NEW_VCT = 'newVolumeClaimTemplate';
const EXISTING_VOLUME = 'existingVolume';
const LOG_AGGREGATOR = 'cattle.io/log-aggregator'

export default Component.extend({
  scope:        service(),
  globalStore:  service(),
  clusterStore: service(),
  settings:     service(),
  cloneApp:     service(),
  intl:         service(),
  router:       service(),
  vlansubnet:   service(),
  growl:        service(),

  tagName: 'form',

  // props
  service:                     null,
  serviceUUID:                 null,
  originService:               null,
  projects:                    null,
  clusters:                    null,
  namespaceSecrets:            null,
  projectSecrets:              null,
  persistentVolumeClaims:      null,
  namespaceConfigMaps:         null,
  namespacedCertificates:      null,
  certificates:                null,
  namespacedDockerCredentials: null,
  projectDockerCredentials:    null,
  allServices:                 null,
  // allIngresses:                null,
  serviceId:                   null,
  loggingEnabled:              null,
  customServiceList:           [],
  defaultServiceList:          [],


  // private props
  activeConfig:                 0,
  jumpToTargetCluster:          true,
  toggleMacvlan:                false,
  securitySectionExpanded:      false,
  targetProjectSecrets:         [],
  targetNamespaceSecrets:       [],
  targetProjectCertificates:    [],
  targetNamespaceCertificates:  [],
  targetNamespaceConfigMaps:    [],
  targetPersistentVolumes:      [],
  targetPersistentVolumeClaims: [],
  targetStorageClasses:         [],
  supportVlansubnet:            false,
  // showIngressConfig:            false,
  showCredentialConfig:         false,
  loadingDepData:               true,
  loadDepDataErrors:            [],
  macvlanSubnetEnabled:         false,

  targetForm: {
    project:   '',
    namespace: '',
  },
  credentialList:       [],
  originCredentialList: [],
  certificateList:      [],
  secretList:           [],
  configMapList:        [],
  // ingressList:          [],

  // Errors from components
  commandErrors:    null,
  volumeErrors:     null,
  networkingErrors: null,
  secretsErrors:    null,
  readyCheckErrors: null,
  liveCheckErrors:  null,
  schedulingErrors: [],
  securityErrors:   null,
  scaleErrors:      null,
  imageErrors:      null,
  portErrors:       [],
  namespaceErrors:  null,
  labelErrors:      null,
  annotationErrors: null,
  // ingressErrors:    null,
  permissionErrors: null,
  lifecycleErrors:  null,

  targetEnvironmentFromMap: {},
  environmentFromMap:       {},
  targetVolumesArray:       [],
  volumesArray:             [],
  separateLivenessCheckMap: {},

  defaultServiceEnabled: 'true',

  cluster:       alias('scope.pendingCluster'),
  project:       alias('scope.pendingProject'),
  isStatefulSet: computed.equal('service.type', 'statefulSet'),

  init() {
    this._super(...arguments);
    set(this, 'originService', this.service.clone());
    // init target
    setProperties(this.targetForm, {
      project:   '',
      namespace: '',
    });

    if (get(this, 'loggingEnabled')) {
      const annotations = get(this, 'primaryResource.annotations') || {}

      const excludeContainer = annotations['field.cattle.io/excludeContainer'] === 'true' ? true : false

      set(this, 'excludeContainer', excludeContainer)
    }
  },

  actions: {
    promptRemoveContainer() {

    },
    resetForm() {
      set(this, 'errors', []);
      this.initService();
    },
    // removeIngress(ingress) {
    //   get(this, 'ingressList').removeObject(ingress);
    // },
    removeService(service) {
      get(this, 'customServiceList').removeObject(service);
    },
    activateContainerConfig(index) {
      set(this, 'activeConfig', index)
    },
    toggleSeparateLivenessCheck(index) {
      const c = get(this, 'service.containers')[index];
      const result = this.separateLivenessCheckMap[c._originName];

      set(this.separateLivenessCheckMap, c._originName, !result);
    },
    handleToggleMacvlan(enabled) {
      set(this, 'toggleMacvlan', enabled);
    },
    updateSecret(secret, originSecret) {
      secret._originName = originSecret._originName;
      Object.values(this.environmentFromMap).reduce((t, c) => {
        t.push(...c);

        return t;
      }, [])
        .filter((item) => item.type === 'secret' && item.refData._originName === secret._originName)
        .forEach((item) => {
          set(item, 'refData', secret);
          set(item, 'data.sourceName', secret.name)
        });
      this.volumesArray.filter((item) => item.secret && item.secret._originName === secret._originName)
        .forEach((item) => {
          set(item, 'secret', secret);
          set(item, 'volume.secretName', secret.name);
        });
    },
    updateConfigMap(configMap, originConfigMap) {
      configMap._originName = originConfigMap._originName;
      Object.values(this.environmentFromMap).reduce((t, c) => {
        t.push(...c);

        return t;
      }, [])
        .filter((item) => item.type === 'configMap' && item.refData._originName === configMap._originName)
        .forEach((item) => {
          set(item, 'refData', configMap);
          set(item, 'data.sourceName', configMap.name);
        });
      this.volumesArray.filter((item) => item.configMap && item.configMap._originName === configMap._originName)
        .forEach((item) => {
          set(item, 'configMap', configMap);
          set(item, 'volume.configMap.name', configMap.name);
        });
    },
    updatePvc(pvc, originPvc) {
      pvc._originName = originPvc._originName;
      this.volumesArray.filter((item) => item.pvc && item.pvc._originName === originPvc._originName).forEach((item) => {
        set(item, 'pvc', pvc);
      });
    },
    async save(cb) {
      const service = this.service;
      const target = this.targetForm;

      this.setContainersEnvironmentFrom(service.containers);
      this.setVolumesAndVolumeMounts(service);
      this.setLivenessCheck(service);
      this.setImagePullSecrets(service);
      this.setOtherInfo(service);

      const pvcList = this.getPvcList();
      const secretList = this.getSecretList();
      const certificateList = this.getCertificateList();
      const configMapList = this.getConfigMapList();

      // const ingressList = this.getIngressList();
      const credentialList = this.getCredentialList();
      const serviceList = this.getCustomServiceList();

      const result = await this.validate();

      if (!result) {
        cb(false);

        return;
      }
      // remove secrets annotation: `lifecycle.cattle.io/create.secretsController_<cluster id>`
      const secretAnnotationKeyPrefix = 'lifecycle.cattle.io/create.secretsController_';
      const removeSecretAnnotation = (s) => {
        Object.keys(s.annotations || {})
          .filter((k) => k.startsWith(secretAnnotationKeyPrefix))
          .forEach((k) => {
            delete s.annotations[k];
          });
      }

      // Whether to create default service for clone workload
      const workloadAnnotations = get(service, 'workloadAnnotations') || {};

      if (get(this, 'portsLen') === 0) {
        set(service, 'workloadAnnotations', {
          ...workloadAnnotations,
          'field.cattle.io/defaultPort': this.defaultServiceEnabled
        });
      } else {
        delete workloadAnnotations['field.cattle.io/defaultPort'];
        set(service, 'workloadAnnotations', workloadAnnotations);
      }

      secretList.forEach(removeSecretAnnotation);
      certificateList.forEach(removeSecretAnnotation);

      const workload = this.serializeResource(this.service);

      workload.containers.forEach((c) => {
        if (!c.ports || c.ports.length === 0) {
          delete c.ports;
        }
      });
      const data = {
        target,
        workload,
        pvcList,
        secretList,
        certificateList,
        configMapList,
        // ingressList,
        credentialList,
        serviceList,
      }

      this.cloneApp.cloneApp(this.project.id, data).then(() => {
        this.send('transitionOut');
        cb(true);
      }).catch((err) => {
        if (err) {
          const body = Errors.stringify(err.body || err);

          set(this, 'errors', [body]);
        } else {
          set(this, 'errors', null);
        }
        cb(false);
      })
    },
    transitionOut() {
      // this.router.transitionTo('containers.index', this.targetForm.project);
      window.location.href = `/p/${ this.targetForm.project }/workloads`;
    },

    cancel() {
      this.router.transitionTo('containers.index', get(this, 'scope.currentProject.id'))
    },
  },

  targetProjectDidChanged: observer('targetForm.project', function() {
    set(this, 'targetForm.namespace', '');
  }),

  targetNamespaceDidChanged: observer('targetForm.namespace', function() {
    const targetProjectId = get(this, 'targetForm.project');
    const targetNamespaceId = get(this, 'targetForm.namespace');

    if (targetProjectId && targetNamespaceId) {
      set(this, 'errors', []);
      this.initService();
      this.loadDepData(targetProjectId, targetNamespaceId);
    }
  }),

  portsLen: computed('service.containers.@each.ports', function() {
    return get(this, 'service.containers').reduce((t, c) => {
      t = t + (c.ports || []).length;

      return t;
    }, 0);
  }),

  allDockerCredentials: computed('projectDockerCredentials.[]', 'namespacedDockerCredentials.[]', function() {
    return [...this.projectDockerCredentials.slice(), ...this.namespacedDockerCredentials.slice()];
  }),
  allSecrets: computed('projectSecrets.[]', 'namespaceSecrets.[]', function() {
    return [...this.projectSecrets.slice(), ...this.namespaceSecrets.slice()];
  }),

  targetProject: computed('targetForm.project', 'allProjectsGroupedByCluster', function() {
    const targetProject = get(this, 'allProjectsGroupedByCluster').findBy('value', get(this, 'targetForm.project'));

    return targetProject && targetProject.project;
  }),

  targetCluster: computed('targetForm.project', 'allProjectsGroupedByCluster', function() {
    const targetProject = get(this, 'allProjectsGroupedByCluster').findBy('value', get(this, 'targetForm.project'));

    return targetProject && targetProject.cluster;
  }),

  allProjectsGroupedByCluster: computed('cluster.id', 'projects.[]', function() {
    return get(this, 'projects')
      // .filter((p) => get(p, 'cluster'))
      .filter((p) => {
        const c = get(p, 'cluster');

        return c && get(this, 'cluster.id') !== c.id && c.id !== 'local';
      })
      .map((p) => {
        const clusterDisplayName =  get(p, 'cluster.displayName');
        const clusterId =  get(p, 'cluster.id');
        const cluster = get(p, 'cluster');

        const out = {
          name:    get(p, 'displayName'),
          value:   get(p, 'id'),
          clusterDisplayName,
          clusterId,
          cluster,
          project: p,
        };

        return out;
      });
  }),

  namespaceChoices: computed('allProjectsGroupedByCluster', 'targetForm.project', function() {
    const projectId = get(this, 'targetForm.project');

    if (!projectId) {
      return [];
    }

    const pc = get(this, 'allProjectsGroupedByCluster').findBy('value', projectId);

    if (!pc) {
      return []
    }

    return this.cloneApp.loadClusterNamespaces(pc.clusterId)
      .then((resp) => {
        const namespaces = resp.body.data.filter((ns) => ns.projectId === projectId).map((ns) => (get(this, 'globalStore').createRecord(ns)));

        set(this, 'targetForm.namespace', namespaces[0] ? namespaces[0].id : '');

        return namespaces;
      });
  }),

  targetNamespace: computed('namespaceChoices.[]', 'namespaceChoices.value', 'targetForm.namespace', function() {
    const nsChoices = get(this, 'namespaceChoices.value');

    if (!nsChoices || !nsChoices.findBy) {
      return {};
    }

    return nsChoices.findBy('id', get(this, 'targetForm.namespace'));
  }),

  namespace: computed('service.namespaceId', function() {
    const namespaceId = get(this, 'service.namespaceId');

    if (namespaceId) {
      return get(this, 'clusterStore').getById('namespace', namespaceId);
    }

    return;
  }),

  showWorkloadConfigView: computed('targetForm.project', 'targetForm.namespace', 'loadDepDataErrors.[]', 'loadingDepData', function() {
    return !this.loadingDepData && this.targetForm.project && this.targetForm.namespace && this.loadDepDataErrors.length === 0;
  }),

  async validate() {
    let errors = this.service.validationErrors() || [];

    this.service.containers.forEach((c, index) => {
      if (index === 0) {
        return;
      }
      errors.push(...c.validateQuota(this.targetNamespace));
      if (index !== 0) {
        c.validationErrors().forEach((err) => {
          errors.push(`${ get(c, 'displayName')  }: ${  err }`);
        })
      }
    });
    errors.push(...this.validateContainersName());
    errors.push(...this.validateVolumes());
    errors.push(...this.validateImagePullSecrets());
    errors.push(...this.validatePermission());
    // Errors from components
    errors.pushObjects(get(this, 'commandErrors') || []);
    errors.pushObjects(get(this, 'volumeErrors') || []);
    errors.pushObjects(get(this, 'networkingErrors') || []);
    errors.pushObjects(get(this, 'secretsErrors') || []);
    errors.pushObjects(get(this, 'readyCheckErrors') || []);
    errors.pushObjects(get(this, 'liveCheckErrors') || []);
    errors.pushObjects(get(this, 'schedulingErrors') || []);
    errors.pushObjects(get(this, 'securityErrors') || []);
    errors.pushObjects(get(this, 'scaleErrors') || []);
    errors.pushObjects(get(this, 'imageErrors') || []);
    errors.pushObjects(get(this, 'portErrors') || []);
    errors.pushObjects(get(this, 'namespaceErrors') || []);
    errors.pushObjects(get(this, 'labelErrors') || []);
    errors.pushObjects(get(this, 'annotationErrors') || []);
    // errors.pushObjects(get(this, 'ingressErrors') || []);
    errors.pushObjects(get(this, 'lifecycleErrors') || []);

    const serviceErrors = await this.validateService();

    errors.pushObjects(serviceErrors);

    errors = errors.uniq();

    if (get(errors, 'length')) {
      set(this, 'errors', errors);

      return false;
    }

    set(this, 'errors', null);

    return true;
  },

  validatePermission() {
    const envFroms = Object.values(this.environmentFromMap).reduce((t, c) => {
      t.push(...c);

      return t;
    }, []).filter((item) => (item.type === 'secret' || item.type === 'configMap') && !item.refData);

    const volumes = this.volumesArray.filter((item) => {
      if ([C.VOLUME_TYPES.SECRET, C.VOLUME_TYPES.CERTIFICATE].includes(item.mode)) {
        return !item.secret
      }
      if (item.mode === C.VOLUME_TYPES.CONFIG_MAP) {
        return !item.configMap;
      }

      return false;
    });

    const intl = get(this, 'intl');
    const errors = [];

    envFroms.forEach((item) => {
      errors.push(intl.t('cloneCrossCluster.newContainer.errors.noPermissionAccessResource', {
        type: item.type === 'secret' ? intl.t('cruPersistentVolume.secret.secretName.label') : intl.t('cruPersistentVolume.configMap.name.label'),
        name: item.data.sourceName,
      }));
    });
    volumes.forEach((item) => {
      let type;
      let name;

      if (item.mode === C.VOLUME_TYPES.SECRET) {
        type = intl.t('cruPersistentVolume.secret.secretName.label');
        name = item.volume.secret.secretName;
      } else if (item.mode === C.VOLUME_TYPES.CERTIFICATE) {
        type = intl.t('cruPersistentVolume.secret.certificateName.label');
        name = item.volume.secret.secretName;
      } else {
        type = intl.t('cruPersistentVolume.configMap.name.label');
        name = item.volume.configMap.name;
      }

      errors.push(intl.t('cloneCrossCluster.newContainer.errors.noPermissionAccessResource', {
        type,
        name,
      }));
    });

    return errors;
  },

  validateQuota(namespace) {
    const projectLimit =  get(this.targetProject, 'resourceQuota.limit');

    if ( !projectLimit ) {
      return [];
    }

    const intl = get(this, 'intl');
    const errors = [];

    const {
      limitsCpu, limitsMemory, requestsCpu, requestsMemory
    } = projectLimit;

    if ( limitsCpu && !get(this, 'resources.limits.cpu') && !get(namespace, 'containerDefaultResourceLimit.limitsCpu') ) {
      errors.push(intl.t('newContainer.errors.quotaRequired', { key: intl.t('formResourceQuota.resources.limitsCpu') }));
    }
    if ( limitsMemory && !get(this, 'resources.limits.memory') && !get(namespace, 'containerDefaultResourceLimit.limitsMemory') ) {
      errors.push(intl.t('newContainer.errors.quotaRequired', { key: intl.t('formResourceQuota.resources.limitsMemory') }));
    }
    if ( requestsCpu && !get(this, 'resources.requests.cpu') && !get(namespace, 'containerDefaultResourceLimit.requestsCpu') ) {
      errors.push(intl.t('newContainer.errors.quotaRequired', { key: intl.t('formResourceQuota.resources.requestsCpu') }));
    }
    if ( requestsMemory && !get(this, 'resources.requests.memory') && !get(namespace, 'containerDefaultResourceLimit.requestsMemory') ) {
      errors.push(intl.t('newContainer.errors.quotaRequired', { key: intl.t('formResourceQuota.resources.requestsMemory') }));
    }

    return errors;
  },

  validateContainersName() {
    const names = this.service.containers.map((c) => (c.name || '').trim().toLowerCase());
    const intl = get(this, 'intl');
    const errors = [];

    // if (names.some((n) => !n)) {
    //   errors.push(intl.t('validation.required', { key: intl.t('formNameDescription.name.label') }));

    //   return errors;
    // }

    if ((new Set(names)).length !== names.length) {
      const duplicate = [...names].sort().reduce((t, c, index, arr) => {
        if (c === arr[index + 1]) {
          t.push(c);
        }

        return t;
      }, []);

      if (duplicate.length > 0) {
        errors.push(intl.t('newContainer.errors.duplicateName', {
          name:    names[0],
          service: duplicate[0],
        }));
      }
    }

    return errors;
  },

  validateVolumes() {
    const errors = [];
    const intl = get(this, 'intl');

    // validate pvc
    this.volumesArray.filter((item) => item.pvc).reduce((t, c) => {
      if (!t.find((item) => item.pvc._originName === c.pvc._originName)) {
        t.push(c);
      }

      return t;
    }, []).forEach((item) => {
      if (item.pvc.storageClassId) {
        const sc = this.targetStorageClasses.find((sc) => sc.id === item.pvc.storageClassId)

        if (!sc) {
          errors.push(intl.t('cloneCrossCluster.newContainer.errors.storageClassNotExist', { pvcName: item.pvc.name }));
        }
        if (sc && sc.annotations
          && (sc.annotations['storageclass.kubernetes.io/is-default-class'] === 'true' || sc.annotations['storageclass.beta.kubernetes.io/is-default-class'] === 'true')
          && (item.pvc.accessModes || []).length === 0) {
          errors.push(intl.t('cloneCrossCluster.newContainer.errors.targetPvcAccessModesDiff', { pvcName: item.pvc.name }));
        }
      } else if (item.pvc.volumeId && !this.targetPersistentVolumes.find((pv) => pv.id === item.pvc.volumeId)) {
        errors.push(intl.t('cloneCrossCluster.newContainer.errors.pvNotExist', { pvcName: item.pvc.name }));
      }
    });

    return errors;
  },

  validateImagePullSecrets() {
    const errors = [];
    const intl = get(this, 'intl');

    this.credentialList.forEach((item) => {
      if (!item._originName) {
        errors.push(intl.t('cloneCrossCluster.newContainer.errors.noPermissionAccessResource', {
          type: intl.t('cloneCrossCluster.newContainer.imagePullSecret.label'),
          name: item.name,
        }));

        return;
      }
      const c = this.originCredentialList.find((oc) => oc._originName === item._originName)

      if (c && (c.name === item.name && JSON.stringify(c.registries) === JSON.stringify(item.registries))) {
        return;
      }

      if (item.name === '') {
        errors.push(intl.t('cloneCrossCluster.newContainer.imagePullSecret.nameRequired'));
      }
      Object.entries(item.registries).forEach((e) => {
        if (e[0] === '') {
          errors.push(intl.t('cloneCrossCluster.newContainer.imagePullSecret.addressRequired'));
        }
        if (e[1].username === '') {
          errors.push(intl.t('cloneCrossCluster.newContainer.imagePullSecret.usernameRequired'));
        }
        if (e[1].password === '') {
          errors.push(intl.t('cloneCrossCluster.newContainer.imagePullSecret.passwordRequired'));
        }
      });
    });

    return errors;
  },

  validateService() {
    const errors = [];

    this.customServiceList.forEach((service) => {
      if (service.targetWorkloadIds) {
        return;
      }
      if (!(service.selector && Object.keys(service.selector).filter((k) => !k.startsWith('workloadID_')).length)) {
        return;
      }
      const serviceSelectors = Object.entries(service.selector).filter((e) => !e[0].startsWith('workloadID_'));

      if (serviceSelectors.length === 0) {
        errors.push(this.intl.t('cloneCrossCluster.newContainer.errors.selectorRequired', { name: service.name }));

        return;
      }
      const result = serviceSelectors.every((e) => this.service.labels[e[0]] === e[1]);

      if (!result) {
        errors.push(this.intl.t('cloneCrossCluster.newContainer.errors.selectorNotMatch', { name: service.name }));
      }
    });
    if (errors.length > 0) {
      return Promise.resolve(errors);
    }

    const promises = this.service.containers.reduce((t, c) => {
      const serviceNames = (c.ports || []).reduce((total, port) => {
        const defaultServiceName = this.generateDefaultServiceName(this.service.name, port);

        if (defaultServiceName) {
          total.push(defaultServiceName);
        }

        return total;
      }, []);

      t.push(...serviceNames);

      return t;
    }, []).map((name) => this.cloneApp.isServiceExist(this.targetForm.project, name));

    return Promise.all(promises)
      .then((resp) => {
        resp.filter((p) => p.exist).forEach((p) => {
          errors.push(this.intl.t('cloneCrossCluster.newContainer.errors.serviceExist', { name: p.name }));
        });

        return errors;
      });
  },

  loadDepData(projectId /* , namespaceId */) {
    this.showLoading();
    const clusterId = projectId.split(':')[0];

    set(this, 'loadingDepData', true);
    set(this, 'loadDepDataErrors', []);

    return Promise.all([this.cloneApp.loadProjectSecrets(projectId),
      this.cloneApp.loadProjectNamespaceSecrets(projectId),
      this.cloneApp.loadConfigMaps(projectId),
      this.cloneApp.loadStorageClasses(clusterId),
      this.cloneApp.loadPvcs(projectId),
      this.cloneApp.loadPvs(clusterId),
      this.vlansubnet.fetchVlansubnets(clusterId).then(() => {
        return true;
      }).catch(() => {
        return false;
      })
    ])
      .then(([
        { body: projectSecrets },
        { body: namespaceSecrets },
        { body: configMaps },
        { body: storageClasses },
        { body: persistentVolumeClaims },
        { body: persistentVolumes },
        supportVlansubnet,
      ]) => {
        this.hideLoading();
        const store = get(this, 'store');

        setProperties(this, {
          loadingDepData:               false,
          targetProjectSecrets:         get(projectSecrets, 'data').filterBy('type', `secret`),
          targetNamespaceSecrets:       get(namespaceSecrets, 'data').filterBy('type', `namespacedSecret`),
          targetProjectCertificates:    get(projectSecrets, 'data').filterBy('type', `certificate`),
          targetNamespaceCertificates:  get(namespaceSecrets, 'data').filterBy('type', `namespacedCertificate`),
          targetNamespaceConfigMaps:    configMaps.data,
          targetStorageClasses:         storageClasses.data.map((item) => store.createRecord(item)),
          targetPersistentVolumeClaims: persistentVolumeClaims.data.map((item) => store.createRecord(item)),
          targetPersistentVolumes:      persistentVolumes.data.map((item) => store.createRecord(item)),
          supportVlansubnet,
        });
      }).catch((err) => {
        this.hideLoading();
        const status = err && parseInt(err.status, 10);

        if ( err && [401, 403].includes(status) ) {
          this.transitionTo('login');

          return;
        }
        const errorMsg = Errors.stringify(err.body || err);

        get(this, 'growl').fromError(errorMsg);
        setProperties(this, {
          loadingDepData:               false,
          targetProjectSecrets:         [],
          targetNamespaceSecrets:       [],
          targetProjectCertificates:    [],
          targetNamespaceCertificates:  [],
          targetNamespaceConfigMaps:    [],
          targetStorageClasses:         [],
          targetPersistentVolumeClaims: [],
          targetPersistentVolumes:      [],
          supportVlansubnet:            false,
        });
        set(this, 'loadDepDataErrors', [errorMsg]);
      });
  },

  initService() {
    set(this, 'service', this.originService.clone());
    if (!get(this.service, 'scheduling.node')) {
      set(this.service, 'scheduling', {
        ...get(this.service, 'scheduling'),
        node: {}
      });
    }
    // delete valan subnet annotations
    if (this.service.annotations && this.service.annotations['macvlan.pandaria.cattle.io/subnet'] && this.service.annotations['k8s.v1.cni.cncf.io/networks']) {
      set(this, 'macvlanSubnetEnabled', true);
      delete this.service.annotations['k8s.v1.cni.cncf.io/networks'];
      delete this.service.annotations['macvlan.pandaria.cattle.io/ip'];
      delete this.service.annotations['macvlan.pandaria.cattle.io/mac'];
      delete this.service.annotations['macvlan.pandaria.cattle.io/subnet'];
    }

    setProperties(this, {
      credentialList:       [],
      originCredentialList: [],
      certificateList:      [],
      secretList:           [],
      configMapList:        [],
      // ingressList:          [],

      targetEnvironmentFromMap: {},
      environmentFromMap:       {},
      targetVolumesArray:       [],
      volumesArray:             [],
      separateLivenessCheckMap: {},

      customServiceList:  [],
      defaultServiceList: [],
    });
    const containers = get(this, 'service.containers');

    // set container originName
    containers.forEach((c) => {
      c._originName = c.name;
    });

    // init health check
    containers.forEach((c) => {
      const ready = get(c, 'readinessProbe');
      const live = get(c, 'livenessProbe');
      const readyStr = JSON.stringify(ready);
      const liveStr = JSON.stringify(live);

      set(this.separateLivenessCheckMap, c._originName, readyStr !== liveStr);
    });
    // init containers environmentFrom
    this.initContainersEnvironmentFrom(containers);

    // init imagePullSecrets
    this.initImagePullSecrets(this.service.imagePullSecrets);

    // init volumes
    this.initVolumes(this.service);

    // init ingresses
    // this.initIngresses(this.allServices, this.allIngresses);

    // init workload services
    this.initWorkloadServices(this.allServices);

    const workloadAnnotations = get(this, 'service.workloadAnnotations') || {};

    set(this, 'defaultServiceEnabled', workloadAnnotations['field.cattle.io/defaultPort'] === 'false' ? 'false' : 'true');
  },

  findAndCloneSecret(name) {
    const found = this.allSecrets.find((secret) => secret.name === name);

    if (found) {
      const clone = found.cloneForNew();

      clone.name = found.name;
      clone._originName = found.name;

      return clone;
    }
    // const intl = get(this, 'intl');
    // const errors = get(this, 'permissionErrors') || [];

    // errors.push(intl.t('cloneCrossCluster.newContainer.errors.noPermissionAccessResource', {
    //   type: type === 'secret' ? intl.t('cruPersistentVolume.secret.secretName.label') : intl.t('cruPersistentVolume.secret.certificateName.label'),
    //   name,
    // }));

    // set(this, 'permissionErrors', errors);
  },

  findAndCloneConfigMap(name) {
    let found = this.namespaceConfigMaps.find((configMap) => name === configMap.name);

    if (found) {
      const clone = found.cloneForNew();

      clone.name = found.name;
      clone._originName = found.name;

      return clone;
    }
    // const intl = get(this, 'intl');
    // const errors = get(this, 'permissionErrors') || [];

    // errors.push(intl.t('cloneCrossCluster.newContainer.errors.noPermissionAccessResource', {
    //   type: intl.t('cruPersistentVolume.configMap.name.label'),
    //   name,
    // }));

    // set(this, 'permissionErrors', errors);
  },

  findAndClonePvc(id) {
    const originPvc = this.persistentVolumeClaims.findBy('id', id);
    const clone = originPvc.cloneForNew();

    setProperties(clone, {
      _originName: originPvc.name,
      name:        originPvc.name,
      projectId:   originPvc.projectId ? this.targetForm.project : null,
      namespaceId: originPvc.namespaceId ? this.targetForm.namespace : null,
    });
    if (clone.storageClassId) {
      clone.volumeId = null;
      if (originPvc.storageClass && originPvc.storageClass.isDefault) {
        const defaultStorageClass = this.targetStorageClasses.find((sc) => sc.annotations && (sc.annotations['storageclass.kubernetes.io/is-default-class'] === 'true' || sc.annotations['storageclass.beta.kubernetes.io/is-default-class'] === 'true'));

        if (defaultStorageClass) {
          set(clone, 'storageClassId', defaultStorageClass.id);
          // set accessModes
          if (defaultStorageClass.annotations) {
            const modes = [{
              mode:     'ReadWriteOnce',
              optional: defaultStorageClass.annotations.readwriteonce === 'true',
            }, {
              mode:     'ReadOnlyMany',
              optional: defaultStorageClass.annotations.readonlymany === 'true',
            }, {
              mode:     'ReadWriteMany',
              optional: defaultStorageClass.annotations.readwritemany === 'true',
            }].filter((m) => m.optional === true);

            if (!(clone.accessModes || []).every((m) => modes.find((item) => m === item.mode))) {
              set(clone, 'accessModes', []);
            }
          }
        }
      }
    }
    delete clone.annotations;

    return clone;
  },

  getSecretType(secretName) {
    let found = this.projectSecrets.findBy('name', secretName);

    if ( found ) {
      if ( get(found, 'type') === C.VOLUME_TYPES.CERTIFICATE ) {
        return C.VOLUME_TYPES.CERTIFICATE;
      }
    } else {
      found = this.namespaceSecrets.findBy('name', secretName);
      if ( found && get(found, 'type') === 'namespacedCertificate' ) {
        return C.VOLUME_TYPES.CERTIFICATE;
      }
    }

    return C.VOLUME_TYPES.SECRET;
  },

  initImagePullSecrets(imagePullSecrets = []) {
    const data = imagePullSecrets.map((item) => {
      const d = this.allDockerCredentials.find((dc) => dc.name === item.name);

      if (d) {
        const clone = d.cloneForNew();

        clone.name = d.name;
        clone._originName = d.name;

        return clone;
      }

      // const intl = get(this, 'intl');
      // const errors = get(this, 'permissionErrors') || [];

      // errors.push(intl.t('cloneCrossCluster.newContainer.errors.noPermissionAccessResource', {
      //   type: intl.t('cloneCrossCluster.newContainer.imagePullSecret.label'),
      //   name: item.name,
      // }));

      // set(this, 'permissionErrors', errors);

      return item;
    });

    setProperties(this, {
      originCredentialList: JSON.parse(JSON.stringify([...data])),
      credentialList:       [...data],
      showCredentialConfig: data.length > 0,
    });
  },
  initContainersEnvironmentFrom(containers) {
    containers.forEach((c) => {
      this.targetEnvironmentFromMap[c._originName] = [];
      const environmentFrom = JSON.parse(JSON.stringify(c.environmentFrom || []));

      const data = environmentFrom.map((item) => {
        if (item.source === 'secret') {
          const secret = this.findAndCloneSecret(item.sourceName, 'secret');

          return {
            type:    'secret',
            data:    item,
            refData: secret,
          }
        } else if (item.source === 'configMap') {
          const configMap = this.findAndCloneConfigMap(item.sourceName);

          return {
            type:    'configMap',
            data:    item,
            refData: configMap,
          }
        } else {
          return { data: item };
        }
      });

      this.environmentFromMap[c._originName] = data;
    });
  },
  // initIngresses(allServices, allIngresses) {
  //   const isPathRelatedCurrentWorkload = (path, allServices) => {
  //     if (path.workloadIds && path.workloadIds.includes(this.serviceId)) {
  //       return true;
  //     }
  //     if (!path.serviceId) {
  //       return false;
  //     }

  //     const relatedService = allServices.find((s) => s.id === path.serviceId);

  //     if (!relatedService) {
  //       return false;
  //     }

  //     if (relatedService.targetWorkloadIds) {
  //       return  relatedService.targetWorkloadIds.includes(this.serviceId);
  //     }

  //     const serviceSelectors = Object.entries(service.selector || {}).filter((e) => !e[0].startsWith('workloadID_'));

  //     if (serviceSelectors.length === 0) {
  //       return false;
  //     }

  //     return serviceSelectors.every((e) => this.service.labels[e[0]] === e[1]);
  //   }

  //   let ingressesRelatedCurrentWorkload = allIngresses.filter((ingress) => ingress.rules.some((rule) => rule.paths.some((path) => isPathRelatedCurrentWorkload(path, allServices)))).map((ingress) => {
  //     const result = { ...ingress }

  //     delete result.id;

  //     return result;
  //   });

  //   ingressesRelatedCurrentWorkload = ingressesRelatedCurrentWorkload.map((ingress) => {
  //   // filter rules
  //     const rules = ingress.rules.filter((rule) => {
  //       const paths = rule.paths.filter((path) => isPathRelatedCurrentWorkload(path, allServices));
  //       const result = paths.length > 0;

  //       if (result) {
  //         rule.paths = paths.map((p) => {
  //           if (p.serviceId) {
  //             return { ...p };
  //           }

  //           return {
  //             ...p,
  //             serviceId:   null,
  //             workloadIds: [this.serviceId],
  //           };
  //         });
  //       }

  //       return result;
  //     });

  //     return {
  //       ...ingress,
  //       rules,
  //     }
  //   });
  //   setProperties(this, {
  //     originIngressList: JSON.parse(JSON.stringify(ingressesRelatedCurrentWorkload)),
  //     ingressList:       [...ingressesRelatedCurrentWorkload],
  //     showIngressConfig: ingressesRelatedCurrentWorkload.length > 0,
  //   });
  // },
  initWorkloadServices(allServices) {
    const defaultServiceList = allServices.filter((s) => s.ownerReferences && s.ownerReferences.some((r) => r.uid === this.serviceUUID));
    const customServiceList = allServices.filter((s) => {
      if (s.targetWorkloadIds) {
        if (s.ownerReferences && !s.ownerReferences.some((r) => r.uid === this.serviceUUID)) {
          return false;
        }

        return s.targetWorkloadIds.includes(this.serviceId)
      }
      const serviceSelectors = Object.entries(s.selector || {}).filter((e) => !e[0].startsWith('workloadID_'));

      if (serviceSelectors.length === 0) {
        return false;
      }

      return serviceSelectors.every((e) => this.service.labels[e[0]] === e[1]);
    }).filter((s) => !defaultServiceList.find((ds) => ds.id === s.id))
      .map((s) => {
        const cloned = this.serializeResource(s);

        if (cloned.kind === 'NodePort') {
          (cloned.ports || []).forEach((p) => {
            p.nodePort = 0;
          });
        }
        if (cloned.externalIPs) {
          cloned.externalIPs = [];
        }

        return cloned;
      });

    setProperties(this, {
      customServiceList,
      defaultServiceList,
    });
  },
  initVolumes(workload) {
    const out                = [];
    const volumes              = workload.volumes || [];
    const volumeClaimTemplates = workload.statefulSetConfig && workload.statefulSetConfig.volumeClaimTemplates ? workload.statefulSetConfig.volumeClaimTemplates : [];

    if (volumeClaimTemplates.length > 0) {
      volumeClaimTemplates.forEach((vct) => {
        set(vct, 'isVolumeClaimTemplate', true);
      });
    }

    let allVolumes           = [].concat(volumes.slice(), volumeClaimTemplates.slice());

    allVolumes.forEach((volume) => {
      let mode;
      // let hidden = false;
      let pvc = null;
      let vct = null;
      let secret = null;
      let configMap = null;

      if (volume.persistentVolumeClaim) {
        mode = NEW_PVC;
        pvc = this.findAndClonePvc(volume.persistentVolumeClaim.persistentVolumeClaimId);
      } else if ( volume.hostPath ) {
        mode = C.VOLUME_TYPES.BIND_MOUNT;
      } else if ( volume.flexVolume && volume.flexVolume.driver === LOG_AGGREGATOR ) {
        mode =  C.VOLUME_TYPES.CUSTOM_LOG_PATH;
        // hidden = get(volume, 'flexVolume.options.containerName') !== get(this, 'containerName');
      } else if ( volume.secret ) {
        mode = this.getSecretType(get(volume, 'secret.secretName'));

        if (mode === C.VOLUME_TYPES.SECRET) {
          secret = this.findAndCloneSecret(volume.secret.secretName, 'secret');
        } else {
          secret = this.findAndCloneSecret(volume.secret.secretName, 'certificate');
        }
      } else if ( volume.configMap ) {
        mode = C.VOLUME_TYPES.CONFIG_MAP;
        configMap = this.findAndCloneConfigMap(volume.configMap.name);
      } else if ( volume.isVolumeClaimTemplate ) {
        mode = NEW_VCT;
        vct = this.store.createRecord(volume);
      } else {
        mode = EXISTING_VOLUME;
      }

      out.push({
        mode,
        pvc,
        vct,
        secret,
        configMap,
        // hidden,
        volume: this.store.createRecord({
          ...volume,
          type: volume.isVolumeClaimTemplate ? 'persistentVolumeClaim' : 'volume',
        }),
        mounts: [],
      });
    });

    get(workload, 'containers').forEach((c) => {
      (c.volumeMounts || []).forEach((mount) => {
        const entry = out.findBy('volume.name', mount.name);

        set(mount, 'containerName', c._originName);

        if (entry) {
          entry.mounts.push(mount);
        }
      });
    });
    // filter out custom log path volume when logging is disabled
    if (!get(this, 'loggingEnabled')) {
      set(this, 'volumesArray', out.filter((row) => row.mode !== C.VOLUME_TYPES.CUSTOM_LOG_PATH));
    } else {
      set(this, 'volumesArray', out);
    }
    set(this, 'targetVolumesArray', []);
  },

  setContainersEnvironmentFrom(containers) {
    containers.forEach((c) => {
      set(c, 'environmentFrom', [
        ...this.environmentFromMap[c._originName].map((item) => item.data),
        ...this.targetEnvironmentFromMap[c._originName],
      ]);
    });
  },

  setVolumesAndVolumeMounts(workload) {
    const array = [...this.volumesArray, ...this.targetVolumesArray];
    const volumeClaimTemplates = [];

    // array.filterBy('pvc').forEach((row) => {
    //   const pvc = get(row, 'pvc');

    //   set(pvc, 'namespaceId', this.targetForm.namespace);
    // });

    if (this.isStatefulSet) {
      array.filterBy('vct').forEach((row) => {
        const vct = get(row, 'vct');

        volumeClaimTemplates.push(vct)
      });

      set(workload, 'statefulSetConfig.volumeClaimTemplates', volumeClaimTemplates);
    }

    array.filterBy('mode', C.VOLUME_TYPES.CUSTOM_LOG_PATH).filterBy('volume.flexVolume.driver', LOG_AGGREGATOR)
      .forEach((row) => {
        const options  = get(row, 'volume.flexVolume.options');
        const mount = row.mounts.find((m) => m.containerName) || {};
        const container = workload.containers.find((c) => c._originName === mount.containerName) || {};

        setProperties(options, {
          containerName: get(container, 'name'),
          namespace:     get(this.targetForm, 'namespace'),
          workloadName:  get(workload, 'name'),
        });
      });

    const volumes = [];
    const containerMountsMap = workload.containers.reduce((t, c) => {
      t[c._originName] = [];

      return t;
    }, {});


    array.forEach((row) => {
      if (row.volume && !row.volume.isVolumeClaimTemplate) {
        volumes.pushObject(row.volume);
      }

      row.mounts.forEach((mount) => {
        if (get(row, 'vct')) {
          set(mount, 'name', get(row, 'vct.name'));
        } else {
          set(mount, 'name', get(row, 'volume.name'));
        }
        containerMountsMap[mount.containerName].pushObject(mount);
      });
      if (row.pvc) {
        set(row, 'volume.persistentVolumeClaim.persistentVolumeClaimId', `${ this.targetForm.namespace }:${ row.pvc.name }`);
      }
    });

    set(workload, 'volumes', volumes);
    workload.containers.forEach((c) => {
      set(c, 'volumeMounts', containerMountsMap[c._originName]);
    });
  },
  setLivenessCheck(workload) {
    workload.containers.forEach((c) => {
      if (!this.separateLivenessCheckMap[c._originName]) {
        const readinessProbe = c.readinessProbe;

        if (readinessProbe) {
          const livenessProbe = Object.assign({}, readinessProbe);

          set(livenessProbe, 'successThreshold', 1);
          set(c, 'livenessProbe', livenessProbe)
        } else {
          set(c, 'livenessProbe', null);
        }
      }
    });
  },
  setImagePullSecrets(workload) {
    set(workload, 'imagePullSecrets', this.credentialList.map((item) => ({ name: item.name })));
  },
  setOtherInfo(workload) {
    const name = (workload.containers[0].name || '').trim().toLowerCase();
    const description = workload.description || '';

    workload.clearConfigsExcept(`${ workload.type  }Config`);
    if ( workload.type === 'statefulSet' &&  !get(workload, 'statefulSetConfig.serviceName') ) {
      set(workload, 'statefulSetConfig.serviceName', name);
    }
    setProperties(workload, {
      name,
      description,
      // namespaceId: this.targetForm.namespace,
    });
    workload.updateTimestamp();
  },
  getPvcList() {
    const out = this.volumesArray.filterBy('pvc').reduce((t, c) => {
      if (!t.find((p) => p.name === c.pvc.name)) {
        t.push(c.pvc);
      }

      return t;
    }, []);

    this.targetVolumesArray.filter((item) => item.mode === NEW_PVC)
      .forEach((item) => {
        out.push(item.pvc);
      });

    out.filter((item) => item.storageClassId).forEach((item) => {
      const sc = this.targetStorageClasses.find((sc) => sc.id === item.storageClassId);
      const driverCondition = sc && get(sc, 'annotations.driverCondition');

      if (driverCondition) {
        if (item.annotations) {
          set(item, 'annotations.driverCondition', driverCondition);
        } else {
          let obj = { driverCondition }

          set(item, 'annotations', obj);
        }
      }
    });

    return out.map((item) => {
      if (!item.storageClassId) {
        delete item.storageClassId
      }

      return this.serializeResource(item)
    });
  },
  getSecretList() {
    const envSecrets = Object.values(this.environmentFromMap).reduce((t, c) => {
      t.push(...c);

      return t;
    }, []).filter((item) => item.type === 'secret' && item.refData).map((item) => item.refData);
    const volumeSecrets =  this.volumesArray.filter((item) => item.mode === C.VOLUME_TYPES.SECRET && item.secret).map((item) => item.secret);
    const out = [];

    envSecrets.forEach((item) => {
      if (!out.find((s) => s.name === item.name)) {
        out.push(item);
      }
    });
    volumeSecrets.forEach((item) => {
      if (!out.find((s) => s.name === item.name)) {
        out.push(item);
      }
    });

    return out.map((item) => {
      const result = this.serializeResource(item);

      delete result.kind;

      return result;
    });
  },
  getCertificateList() {
    const certificates =  this.volumesArray.filter((item) => item.mode === C.VOLUME_TYPES.CERTIFICATE && item.secret).map((item) => item.secret);
    const out = [];

    certificates.forEach((item) => {
      if (!out.find((c) => c.name === item.name)) {
        out.push(item);
      }
    });

    return out.map((item) => this.serializeResource(item));
  },
  getConfigMapList() {
    const envConfigMaps = Object.values(this.environmentFromMap).reduce((t, c) => {
      t.push(...c);

      return t;
    }, []).filter((item) => item.type === 'configMap' && item.refData).map((item) => item.refData);
    const volumeConfigMaps =  this.volumesArray.filter((item) => item.mode === C.VOLUME_TYPES.CONFIG_MAP && item.configMap).map((item) => item.configMap);
    const out = [];

    envConfigMaps.forEach((item) => {
      if (!out.find((s) => s.name === item.name)) {
        out.push(item);
      }
    });
    volumeConfigMaps.forEach((item) => {
      if (!out.find((s) => s.name === item.name)) {
        out.push(item);
      }
    });

    return out.map((item) => this.serializeResource(item));
  },
  // getIngressList() {
  //   return this.ingressList.map((item) => this.serializeResource(item));
  // },
  getCredentialList() {
    return this.credentialList.map((item) => this.serializeResource(item));
  },
  getCustomServiceList() {
    return this.customServiceList.map((item) => {
      const cloned = this.serializeResource(item);

      if (cloned.selector) {
        const workloadIdSelectorKey = Object.keys(cloned.selector).find((k) => k.startsWith('workloadID_'));

        if (workloadIdSelectorKey) {
          delete cloned.selector[workloadIdSelectorKey];
        }
      }
      if (cloned.ports) {
        const portKeys = ['nodePort', 'port', 'targetPort'];

        cloned.ports.forEach((item) => {
          portKeys.filter((pk) => item[pk] && typeof item[pk] === 'string').forEach((pk) => {
            set(item, pk, parseInt(item[pk], 10));
          });
        });
      }
      const timeoutSeconds = get(cloned, 'sessionAffinityConfig.clientIP.timeoutSeconds');

      if (timeoutSeconds && typeof timeoutSeconds === 'string') {
        set(cloned, 'sessionAffinityConfig.clientIP.timeoutSeconds', parseInt(timeoutSeconds, 10))
      }

      return cloned;
    });
  },
  serializeResource(data) {
    let json;

    if (data.serialize) {
      json = data.serialize();
    } else {
      json = JSON.parse(JSON.stringify(data));
      delete json._originName;
    }
    delete json['links'];
    delete json['actions'];
    delete json['actionLinks'];

    return json;
  },
  generateDefaultServiceName(workloadName, port) {
    if (this.generateDNSName(workloadName, port['dnsName'] || '')) {
      if (port['kind'] === 'ClusterIP') {
        return workloadName.toLowerCase();
      }

      return `${ workloadName }-${ port['kind'] }`.toLowerCase();
    }

    return '';
  },
  generateDNSName(workloadName = '', dnsName = '') {
    if (dnsName === '') {
      return true
    }
    // regenerate the name in case port type got changed
    if (dnsName.toLowerCase() === workloadName.toLowerCase() || dnsName.startsWith(`${ workloadName }-`)) {
      return true
    }

    return false
  },
  showLoading() {
    $('#loading-underlay').stop().show().fadeIn({// eslint-disable-line
      duration: 100,
      queue:    false,
      easing:   'linear',
      complete: (function() { // eslint-disable-line
        $('#loading-overlay').stop().show().fadeIn({duration: 200, queue: false, easing: 'linear'}); // eslint-disable-line
      })()
    });
  },

  hideLoading() {
    $('#loading-overlay').stop().fadeOut({// eslint-disable-line
      duration: 200,
      queue:    false,
      easing:   'linear',
      complete: (function() { // eslint-disable-line
        $('#loading-underlay').stop().fadeOut({duration: 100, queue: false, easing: 'linear'}); // eslint-disable-line
      })()
    });
  }
});