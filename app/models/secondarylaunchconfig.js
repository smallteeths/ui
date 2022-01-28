import { computed } from '@ember/object';
import LC from 'ui/models/launchconfig';

var secondaryLaunchConfigs = LC.extend({
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

export default secondaryLaunchConfigs;
