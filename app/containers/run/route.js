import EmberObject from '@ember/object';
import { inject as service } from '@ember/service';
import { get, set } from '@ember/object';
import { hash, resolve, reject } from 'rsvp';
import Route from '@ember/routing/route';
import Ember from 'ember';
import C from 'ui/utils/constants';

export default Route.extend({
  prefs:        service(),
  clusterStore: service(),
  globalStore:  service(),

  beforeModel() {
    const promises = {};

    if (!window.Prettycron) {
      set(promises, 'Prettycron', import('prettycron'));
    }

    if (!window.ShellQuote) {
      set(promises, 'ShellQuote', import('shell-quote'));
    }

    return hash(promises).then((resolved) => {
      if (resolved.Prettycron) {
        window.Prettycron = resolved.Prettycron;
      }

      if (resolved.ShellQuote) {
        window.ShellQuote = resolved.ShellQuote;
      }

      return resolved;
    });
  },

  model(params/* , transition*/) {
    var store = get(this, 'store');

    const gs = get(this, 'globalStore');
    const appRoute = window.l('route:application');
    const project = appRoute.modelFor('authenticated.project').get('project');
    const projectId = project.get('id');
    const clusterId = project.get('clusterId');
    let pspId = ''

    if (project.get('cluster.rancherKubernetesEngineConfig.services.kubeApi.podSecurityPolicy')) {
      let clusterPspId = project.get('cluster').defaultPodSecurityPolicyTemplateId ? project.get('cluster').defaultPodSecurityPolicyTemplateId : '';
      let projectPspId = project.podSecurityPolicyTemplateId ? project.podSecurityPolicyTemplateId : '';

      pspId = projectPspId ? projectPspId : clusterPspId
    }

    const clusterLogging = gs.find('clusterLogging').then((res) => {
      const logging = res.filterBy('clusterId', clusterId).get('firstObject');

      return this.isLoggingEnabled(logging);
    });

    const projectLogging = gs.find('projectLogging').then((res) => {
      const logging = res.filterBy('projectId', projectId).get('firstObject');

      return this.isLoggingEnabled(logging);
    });

    let promise = null;

    if (params.workloadId) {
      // Existing Service
      promise = store.find('workload', params.workloadId).then((workload) => this.modelForExisting(workload, params));
    } else {
      promise = resolve(this.modelForNew(params));
    }

    const harborVersion = get(this, 'globalStore').rawRequest({ url: '/v3/settings/harbor-version' }).then((resp) => {
      return resp && resp.body && resp.body.value ? resp.body.value : ''
    }).catch((err) => {
      if (err.status === 404){
        return ''
      } else {
        return reject(err);
      }
    });
    const psps = gs.findAll('podSecurityPolicyTemplate');

    return hash({
      dataMap: promise,
      clusterLogging,
      projectLogging,
      harborVersion,
      psps,
    }).then((hash) => ({
      loggingEnabled: hash.clusterLogging || hash.projectLogging,
      dataMap:        hash.dataMap,
      harborVersion:  hash.harborVersion,
      psp:            hash.psps ? hash.psps.find((item) => item.name === pspId && !params.workloadId) : null,
    }))
  },

  resetController(controller, isExiting/* , transition*/) {
    if (isExiting) {
      set(controller, 'namespaceId', null);
      set(controller, 'workloadId', null);
      set(controller, 'podId', null);
      set(controller, 'upgrade', null);
      set(controller, 'addSidekick', null);
      set(controller, 'launchConfigIndex', null);
    }
  },

  queryParams: { launchConfigIndex: { refreshModel: true } },

  modelForNew(params) {
    let scaleMode = get(this, `prefs.${ C.PREFS.LAST_SCALE_MODE }`) || 'deployment';

    if (scaleMode === 'container' || scaleMode === 'service') {
      scaleMode = 'deployment';
    }

    return EmberObject.create({
      scaleMode,
      workload:  this.emptyWorkload(params),
      container: this.emptyContainer(params),
      isUpgrade: false,
    });
  },

  modelForExisting(_workload, params) {
    if (!_workload) {
      return Ember.RVP.reject('Workload not found');
    }

    const clone = _workload.clone();
    const cloneType = clone.type;

    if ( !params.upgrade && params.addSidekick !== 'true' ) {
      const defaultServiceEnabled = clone['workloadAnnotations'] ? clone['workloadAnnotations']['field.cattle.io/defaultPort'] : '';

      delete clone['workloadAnnotations'];
      delete clone['workloadLabels'];
      delete clone['publicEndpoints'];
      if (defaultServiceEnabled) {
        clone['workloadAnnotations'] = { 'field.cattle.io/defaultPort': defaultServiceEnabled };
      }
      set(clone, 'type', 'workload');
      if ( clone.labels ) {
        delete clone.labels['workload.user.cattle.io/workloadselector'];
      }
      if ( clone.selector && clone.selector.matchLabels) {
        delete clone.selector.matchLabels['workload.user.cattle.io/workloadselector'];
        delete clone.selector.matchLabels['controller-uid'];
        if ( !Object.keys(clone.selector.matchLabels).length ) {
          delete clone.selector['matchLabels'];
        }
      }
      if ( clone.labels ) {
        delete clone.labels['controller-uid'];
        delete clone.labels['job-name'];
        delete clone.labels['job.saic.pandaria.io/workloadselector'];
      }
    }

    const containerNames = clone.containers.map((x) => get(x, 'name'));
    let containerName = null;

    if (params.launchConfigIndex !== null) {
      const launchConfigIndex = parseInt(params.launchConfigIndex, 10)

      if (launchConfigIndex > -1) {
        containerName = clone.containers[launchConfigIndex + 1].name;
      } else if (launchConfigIndex === -1) {
        containerName = '';
      }
    }

    // Add a sidekick
    if (params.addSidekick) {
      return EmberObject.create({
        scaleMode: 'sidekick',
        workload:  clone,
        container: this.emptyContainer(params, get(clone, 'namespaceId')),
        isUpgrade: false,
      });
    } else if (containerName === null) {
      // Figure out the container name
      if (containerNames.length > 1) {
        if (params.upgrade) {
          // If there are sidekicks, you need to pick one & come back
          return EmberObject.create({
            workload:           clone,
            containerNames,
            selectLaunchConfig: true,
          });
        // } else {
        //   // Clone with multiple containers not supported yet
        //   return Ember.RVP.reject('Cloning a workload with multiple containers not supported');
        }
      } else {
        // Otherwise use primary
        containerName = '';
      }
    }

    let container;

    if (containerName === '') {
      // The primary/only container
      container = clone.containers[0];
    } else {
      // Existing container
      container = clone.containers.findBy('name', containerName);
    }

    if (params.upgrade) {
      // Upgrade workload
      let out = EmberObject.create({
        scaleMode: (containerName ? 'sidekick' : cloneType),
        workload:  clone,
        container,
        isUpgrade: true
      });

      return out;
    } else {
      // Clone workload with one container
      let neu = get(this, 'store').createRecord(clone.serializeForNew());

      delete neu.deploymentStatus;
      container = neu.containers[0];

      // Cleanup port mappings so they get new services
      (neu.containers || []).forEach((container) => {
        (container.ports || []).forEach((port) => {
          delete port.name;
          delete port.dnsName;
        });
      });

      return EmberObject.create({
        scaleMode: cloneType,
        workload:  neu,
        container,
        isUpgrade: false
        // no launchConfigIndex because this will be a new service or sidekick
      });
    }
  },

  getNamespaceId(params) {
    const clusterStore = get(this, 'clusterStore');

    let ns = null;

    if (params.namespaceId) {
      ns = clusterStore.getById('namespace', params.namespaceId);
    }

    if (!ns) {
      const project = window.l('route:application').modelFor('authenticated.project')
        .get('project');
      const projectId = project.get('id');
      const lastNamespace = clusterStore.getById('namespace', get(this, `prefs.${ C.PREFS.LAST_NAMESPACE }`));

      if ( lastNamespace && get(lastNamespace, 'projectId') === projectId ) {
        ns = lastNamespace;
      }
    }

    let namespaceId = null;

    if (ns) {
      namespaceId = ns.get('id');
    }

    return namespaceId;
  },

  emptyWorkload(params) {
    const store = get(this, 'store');

    return store.createRecord({
      type:          'workload',
      namespaceId:   this.getNamespaceId(params),
      scale:         1,
      dnsPolicy:     'ClusterFirst',
      restartPolicy: 'Always',
      labels:        {},
      containers:    [],
    });
  },

  emptyContainer(params, namespaceId) {
    return get(this, 'store').createRecord({
      type:                     'container',
      tty:                      true,
      stdin:                    true,
      privileged:               false,
      allowPrivilegeEscalation: false,
      readOnly:                 false,
      runAsNonRoot:             false,
      namespaceId:              namespaceId ? namespaceId : this.getNamespaceId(params),
      imagePullPolicy:          get(this, `prefs.${ C.PREFS.LAST_IMAGE_PULL_POLICY }`) || 'Always',
    });
  },

  isLoggingEnabled(logging) {
    if (!logging) {
      return false
    }

    const {
      customTargetConfig,
      elasticsearchConfig,
      fluentForwarderConfig,
      kafkaConfig,
      splunkConfig,
      syslogConfig,
    } = logging

    if (customTargetConfig || elasticsearchConfig || fluentForwarderConfig || kafkaConfig || splunkConfig || syslogConfig) {
      return true
    } else {
      return false
    }
  },
});
