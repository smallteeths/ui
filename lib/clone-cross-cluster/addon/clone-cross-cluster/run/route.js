import Route from '@ember/routing/route';
import { get, set } from '@ember/object';
import { hash } from 'rsvp';
import Ember from 'ember';
import { inject as service } from '@ember/service';
import prettycron from 'prettycron';
import ShellQuote from 'shell-quote';

export default Route.extend({
  scope:       service(),
  globalStore: service(),
  cloneApp:    service(),

  beforeModel() {
    const promises = {};

    if (!window.Prettycron) {
      set(promises, 'Prettycron', prettycron);
    }

    if (!window.ShellQuote) {
      set(promises, 'ShellQuote', ShellQuote);
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

  model(params) {
    const store = get(this, 'store');
    const gs = get(this, 'globalStore');
    const appRoute = window.l('route:application');
    const project = appRoute.modelFor('authenticated.project').get('project');
    const projectId = project.get('id');
    const clusterId = project.get('clusterId');

    const clusterLogging = gs.find('clusterLogging').then((res) => {
      const logging = res.filterBy('clusterId', clusterId).get('firstObject');

      return this.isLoggingEnabled(logging);
    });
    const projectLogging = gs.find('projectLogging').then((res) => {
      const logging = res.filterBy('projectId', projectId).get('firstObject');

      return this.isLoggingEnabled(logging);
    });

    return hash({
      workloadForNew:                    store.find('workload', params.workload_id).then((workload) => this.modelForNew(workload)),
      projects:                    get(this, 'scope').getAllProjects(),
      clusters:                    get(this, 'scope').getAllClusters(),
      projectSecrets:              store.all('secret'),
      namespaceSecrets:            store.all('namespacedSecret'),
      persistentVolumeClaims:      store.all('persistentVolumeClaim'),
      namespaceConfigMaps:         store.all('configMap'),
      namespacedCertificates:      store.findAll('namespacedcertificate'),
      certificates:                store.findAll('certificate'),
      namespacedDockerCredentials: store.findAll('namespacedDockerCredential'),
      projectDockerCredentials:    store.findAll('dockerCredential'),
      allServices:                 this.cloneApp.loadServices(projectId).then((resp) => resp.body.data),
      // allIngresses:                this.cloneApp.loadIngresses(projectId).then((resp) => resp.body.data),
      serviceId:                   params.workload_id,
      clusterLogging,
      projectLogging,
    }).then((resp) => {
      return {
        ...resp,
        loggingEnabled: resp.clusterLogging || resp.projectLogging,
      }
    });
  },

  modelForNew(_workload) {
    if (!_workload) {
      return Ember.RVP.reject('Workload not found');
    }
    const UUID = _workload.uuid;
    const clone = _workload.clone();

    // Clone workload with one container
    let neu = get(this, 'store').createRecord(clone.serializeForNew());

    delete neu.deploymentStatus;
    if (neu.labels) {
      delete neu.labels['workload.user.cattle.io/workloadselector'];
      delete neu.labels['job.saic.pandaria.io/workloadselector'];
      delete neu.labels['controller-uid'];
      delete neu.labels['job-name'];
    }
    if (neu.selector) {
      if (neu.selector.matchLabels) {
        delete neu.selector.matchLabels['workload.user.cattle.io/workloadselector'];
        delete neu.selector.matchLabels['controller-uid'];
      }

      if ((!neu.selector.matchLabels || Object.keys(neu.selector.matchLabels).length === 0)
        && (!neu.selector.matchExpressions || neu.selector.matchExpressions.length === 0)) {
        delete neu.selector;
      }
    }
    if (neu.workloadLabels) {
      delete neu.workloadLabels['workload.user.cattle.io/workloadselector'];
      delete neu.workloadLabels['controller-uid'];
      delete neu.workloadLabels['job.saic.pandaria.io/workloadselector'];
    }

    // delete scheduling annotations
    if (neu.annotations) {
      delete neu.annotations['workload.cattle.io/state'];
    }

    // Cleanup port mappings so they get new services
    (neu.containers || []).forEach((container) => {
      (container.ports || []).forEach((port) => {
        delete port.name;
        delete port.dnsName;
      });
    });

    return {
      workload: neu,
      uuid:     UUID,
    };
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
