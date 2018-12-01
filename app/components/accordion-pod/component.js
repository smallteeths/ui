import Component from '@ember/component';
import ManageLabels from 'shared/mixins/manage-labels';
import { get, set, observer } from '@ember/object';
import layout from './template';

export default Component.extend(ManageLabels, {
  layout,
  model:         null,
  initExpandAll: true,
  sortBy:        'displayState',
  showKind:      true,
  descending:    true,
  initExpand:       true,
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
      width:          400
    },
    {
      name:           'displayImage',
      sort:           ['displayImage'],
      translationKey: 'generic.image',
    },
    {
      name:           'node',
      sort:           ['displayName'],
      translationKey: 'generic.node',
      width:          180
    },
  ],

  expandAllObserve: observer('expandAll', function() {
    let expandAll = get(this, 'expandAll');

    set(this, 'initExpandAll', expandAll);
  })
});
