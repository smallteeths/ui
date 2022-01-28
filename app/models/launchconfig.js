import { computed } from '@ember/object';
import Resource from '@rancher/ember-api-store/models/resource';

var LaunchConfig = Resource.extend({
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

export default LaunchConfig;
