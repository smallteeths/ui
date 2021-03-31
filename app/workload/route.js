import EmberObject, { set, get } from '@ember/object';
import { hash } from 'rsvp';
import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default Route.extend({
  globalStore: service(),

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

  model(params) {
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
      workload: this.get('store').find('workload', params.workload_id),
      clusterLogging,
      projectLogging,
    }).then((hash) => EmberObject.create({
      ...hash,
      loggingEnabled: hash.clusterLogging || hash.projectLogging,
    }));
  },

  setupController(controller, model) {
    this._super(...arguments);

    let lc = model.get('workload.containers.firstObject');

    controller.setProperties({ launchConfig: lc, });
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
