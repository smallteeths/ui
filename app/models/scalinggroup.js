import { computed } from '@ember/object';
import Service from 'ui/models/service';

var ScalingGroup = Service.extend({
  type:                   'scalingGroup',
  displayEnvironmentVars: computed('launchConfig.env', function() {
    var envs = [];
    var environment = this.get('launchConfig.env') || [];

    environment.forEach((e) => {
      envs.pushObject({
        key:   e.name,
        value: e.value
      })
    });

    return envs;
  }),
});

export default ScalingGroup;
