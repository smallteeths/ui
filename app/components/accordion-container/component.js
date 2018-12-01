import Component from '@ember/component';
import { get, set, observer } from '@ember/object';
import layout from './template';

export default Component.extend({
  layout,
  model:         null,
  initExpandAll: true,
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
      name:           'restarts',
      sort:           ['restarts'],
      translationKey: 'generic.restarts',
      width:          100
    },
  ],

  expandAllObserve: observer('expandAll', function() {
    let expandAll = get(this, 'expandAll');

    set(this, 'initExpandAll', expandAll);
  })
});
