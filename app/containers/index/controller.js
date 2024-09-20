import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import Controller, { inject as controller } from '@ember/controller';
import { searchFields as containerSearchFields } from 'ui/components/pod-dots/component';
import { computed, set } from '@ember/object';

export const headers = [
  {
    name:        'expand',
    sort:        false,
    searchField: null,
    width:       30
  },
  {
    name:           'state',
    sort:           ['sortState', 'displayName'],
    searchField:    'displayState',
    translationKey: 'generic.state',
    width:          120
  },
  {
    name:           'name',
    sort:           ['sortName', 'id'],
    searchField:    'displayName',
    translationKey: 'generic.name',
  },
  {
    name:           'image',
    sort:           ['image', 'displayName'],
    searchField:    'image',
    translationKey: 'generic.image',
  },
  {
    name:           'scale',
    sort:           ['scale:desc', 'isGlobalScale:desc', 'displayName'],
    searchField:    null,
    translationKey: 'stacksPage.table.scale',
    classNames:     'text-center',
    width:          100
  },
];

export default Controller.extend({
  scope:             service(),
  prefs:             service(),

  projectController: controller('authenticated.project'),
  queryParams:       ['sortBy'],
  sortBy:            'name',

  headers,
  extraSearchFields:    ['id:prefix', 'displayIp:ip', 'namespaceId'],
  extraSearchSubFields: containerSearchFields,

  labelSelector: [],

  group:             alias('projectController.group'),
  groupTableBy:      alias('projectController.groupTableBy'),
  expandedInstances: alias('projectController.expandedInstances'),
  preSorts:          alias('projectController.preSorts'),

  actions: {
    toggleExpand() {
      this.projectController.send('toggleExpand', ...arguments);
    },
    labelSelectorChange(d) {
      set(this, 'labelSelector', d)
    }
  },

  rows: computed('group', 'labelSelector.@each.{key,values,validate}', 'model.pods', 'model.workloads.@each.{isBalancer,namespaceId}', function() {
    const groupBy = this.group;
    let out = [];

    switch (groupBy) {
    case 'none':
    case 'node':
      if (this.labelSelector.length > 0) {
        out = this.get('model.pods').filter((p) => p.labels && this.labelSelector.every((s) => s.validate(s.key, s.values, p.labels)));
      } else {
        out = this.get('model.pods');
      }
      break;
    default:
      out = this.get('model.pods').filter((obj) => !obj.get('workloadId'));
      if (this.labelSelector.length > 0) {
        out.pushObjects(this.get('model.workloads')
          .filter((w) => w.labels && this.labelSelector.every((s) => s.validate(s.key, s.values, w.labels)))
          .slice());
      } else {
        out.pushObjects(this.get('model.workloads').slice());
      }
      break
    }

    return out;
  }),

  groupByRef: computed('group', function() {
    const group = this.group;

    if (group === 'node') {
      return 'node';
    }

    return 'namespace';
  }),
});
