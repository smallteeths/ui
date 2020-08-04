import Component from '@ember/component';
import layout from './template';
import { get, computed, set } from '@ember/object';

export default Component.extend({
  layout,
  model:   null,
  tagName: '',

  containerStatus: computed('containerStatuses', 'model', function() {
    const status = get(this, 'containerStatuses')[get(this, 'model.name')]

    if (status.stateTooltip) {
      set(status, 'stateTooltip', this.factory(get(status, 'stateTooltip')));
    }

    if (status.lastStateTooltip) {
      set(status, 'lastStateTooltip', this.factory(get(status, 'lastStateTooltip')));
    }

    return status;
  }),
  factory(opt) {
    const needs = ['containerID', 'exitCode', 'message', 'reason', 'signal', 'finishedAt', 'startedAt']
    const ContainerState = function(opt) {
      Object.keys(opt).forEach((key) => {
        if (needs.includes(key)) {
          this[key] = opt[key]
        }
      })
    }

    return new ContainerState(opt);
  }
});
