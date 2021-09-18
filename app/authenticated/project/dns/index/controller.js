import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import Controller, { inject as controller } from '@ember/controller';
import { computed, set } from '@ember/object';

export default Controller.extend({
  scope: service(),

  projectController: controller('authenticated.project'),
  queryParams:       ['sortBy'],
  sortBy:            'name',

  headers: [
    {
      name:           'state',
      sort:           ['stack.isDefault:desc', 'stack.displayName', 'sortState', 'displayName'],
      searchField:    'displayState',
      translationKey: 'generic.state',
      width:          120
    },
    {
      name:           'name',
      sort:           ['stack.isDefault:desc', 'stack.displayName', 'displayName', 'id'],
      searchField:    'displayName',
      translationKey: 'generic.name',
    },
    {
      name:           'displayType',
      sort:           ['displayType', 'displayName', 'id'],
      searchField:    'displayType',
      translationKey: 'generic.type',
      width:          150,
    },
    {
      name:           'target',
      sort:           false,
      searchField:    'displayTargets',
      translationKey: 'dnsPage.table.target',
    },
  ],

  labelSelector: [],

  groupTableBy:      alias('projectController.groupTableBy'),
  expandedInstances: alias('projectController.expandedInstances'),
  preSorts:          alias('projectController.preSorts'),

  actions: {
    labelSelectorChange(d) {
      set(this, 'labelSelector', d)
    }
  },

  // rows: alias('model.records'),
  rows: computed('model.records', 'labelSelector.@each.{key,values,validate}', function() {
    if (this.labelSelector.length > 0) {
      return this.model.records.filter((r) => r.labels && this.labelSelector.every((s) => s.validate(s.key, s.values, r.labels)));
    }

    return this.model.records;
  }),
});
