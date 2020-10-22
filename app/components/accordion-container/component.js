import Component from '@ember/component';
import layout from './template';
import { computed, get, set } from '@ember/object';

export default Component.extend({
  layout,
  model:         null,
  status:        null,
  expandOnInit:  true,
  sortBy:        'displayState',
  descending:    true,
  initExpand:    true,
  headers:       [
    {
      name:           'displayState',
      sort:           ['displayState'],
      translationKey: 'generic.state',
      width:          120
    },
    {
      name:           'name',
      sort:           ['name'],
      translationKey: 'generic.name',
    },
    {
      name:           'image',
      sort:           ['image'],
      translationKey: 'generic.image',
    },
    {
      name:           'lastState',
      sort:           ['lastState'],
      translationKey: 'conditionSections.table.lastState',
    },
    {
      name:           'restarts',
      sort:           ['restarts'],
      translationKey: 'generic.restarts',
      width:          100
    },
  ],
  containerStatuses: computed('containers.[]', 'status', function(){
    const containers = get(this, 'containers') || [];
    const containerStatuses = get(this, 'status.containerStatuses') || [];
    const initContainerStatuses = get(this, 'status.initContainerStatuses') || [];
    const statusesTemp = [].concat(containerStatuses).concat(initContainerStatuses);
    const statuses = {};

    containers.forEach((c) => {
      const result = statusesTemp.find((s) => s.name === c.name);

      if (!result) {
        return;
      }

      statuses[c.name] = result;
    })

    Object.keys(statuses).forEach((k) => {
      const s = statuses[k];

      set(s, 'stateTooltip', get(s, 'state')[this.getState(get(s, 'state')).label]);
      set(s, 'lastStateTooltip', get(s, 'lastState')[this.getState(get(s, 'lastState')).label]);
      set(s, 'displayLastState', this.getState(get(s, 'lastState')));
    });

    return statuses;
  }),
  getState(o) {
    const keys = ['running', 'terminated', 'waiting'];
    const bg = ['bg-success', 'bg-success', 'bg-info'];
    let state = {};

    keys.forEach((key, index) => {
      if (o[key]) {
        return state = {
          label: key,
          color: bg[index]
        };
      }
    });

    return state
  }
});
