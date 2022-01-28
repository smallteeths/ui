import { computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import Controller from '@ember/controller';
import { get } from '@ember/object';
import { inject as service } from '@ember/service';

export default Controller.extend({
  scope: service(),

  launchConfig: null,

  service:           alias('model.workload'),
  monitoringEnabled: alias('scope.currentCluster.isMonitoringReady'),

  displayEnvironmentVars: computed('service.launchConfig.env', function() {
    var envs = [];
    var environment = get(this, 'service.launchConfig.env') || [];

    environment.forEach((e) => {
      envs.pushObject({
        key:   e.name,
        value: e.value
      })
    });

    return envs;
  }),
});
