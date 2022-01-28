import { computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import Controller from '@ember/controller';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';

export default Controller.extend({
  scope: service(),

  launchConfig: null,

  showAddPodModal: false,
  podChangeNum:    0,

  service:           alias('model.workload'),
  monitoringEnabled: alias('scope.currentCluster.isMonitoringReady'),

  actions: {
    podDown(){
      this.adjustPod(-1);
    },
    podUp(){
      this.adjustPod(1);
    }
  },
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

  excludeContainer: computed('model.workload.annotations', function() {
    const annotations = get(this, 'model.workload.annotations') || {}

    const excludeContainer = annotations['field.cattle.io/excludeContainer'] === 'true' ? true : false

    return excludeContainer
  }),

  adjustPod(num){
    set(this, 'podChangeNum', num)
    set(this, 'showAddPodModal', true);
  }
});
