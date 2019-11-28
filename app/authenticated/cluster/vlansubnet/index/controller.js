import { inject as service } from '@ember/service';
import Controller from '@ember/controller';
import { get, set, computed, observer } from '@ember/object';
import { all } from 'rsvp';

export const headers = [
  {
    name:           'displayName',
    sort:           ['displayName'],
    searchField:    'displayName',
    translationKey: 'generic.name',
  },
  {
    name:           'project',
    translationKey: 'generic.project',
  },
  {
    name:           'master',
    label:          'Master',
    sort:           ['master'],
    searchField:    'master',
  },
  {
    name:           'vlan',
    label:          'VLAN',
    sort:           ['vlan'],
    searchField:    'vlan',
  },
  {
    name:           'cidr',
    label:          'CIDR',
    sort:           ['cidr'],
    searchField:    'cidr',
    width:          120,
  },
  {
    name:           'ipRanges',
    label:          'IP Ranges',
    width:          210,
  },
  {
    name:           'routes',
    label:          'Custom Routes',
    width:          180,
  },
  {
    name:           'mode',
    label:          'Mode',
    sort:           ['mode'],
    searchField:    'mode',
    width:          80
  },
  {
    name:           'gateway',
    label:          'Gateway',
    sort:           ['gateway'],
    searchField:    'gateway',
  },
  {
    classNames:     'text-right pr-20',
    name:           'creationTimestamp',
    label:          '创建时间',
    sort:           ['creationTimestamp'],
    searchField:    false,
  },
];

export default Controller.extend({
  growl:                  service(),
  vlansubnet:             service(),
  scope:                  service(),
  router:                 service(),
  session:                service(),
  sortBy:                 'name',
  headers,
  data:                   [],
  loading:                false,
  showConfirmDeleteModal: false,
  selectedData:           null,
  availableActions:       [
    {
      action:         'remove',
      icon:           'icon icon-trash',
      label:          'action.remove',
    },
  ],
  rowActions: [
    {
      action:         'edit',
      icon:           'icon icon-edit',
      label:          'action.edit',
      bulkable:       false,
      single:         true,
    },
    {
      action:         'remove',
      icon:           'icon icon-trash',
      label:          'action.remove',
    },
    {
      action:         'clone',
      icon:           'icon icon-copy',
      label:          'action.clone',
    },
  ],
  init() {
    this._super(...arguments);
    this.vlansubnetsDidChanged();
  },
  actions: {
    pageChange(next) {
      if (get(this, 'loading')) {
        return;
      }
      const clusterId = get(this, 'scope.currentCluster.id');
      const limit = get(this, 'prefs.tablePerPage');
      const p = {
        limit,
        continue:      next,
        labelSelector: get(this, 'model.vlansubnets.labelSelector'),
      };

      get(this, 'vlansubnet').fetchVlansubnets(clusterId, p).then((resp) => {
        set(this, 'loading', false);
        const data = [...get(this, 'model.vlansubnets.data')];

        data.push(...resp.body.data);

        set(this, 'model.vlansubnets', {
          data,
          continue: resp.body.metadata.continue,
        });
      }).catch(() => {
        set(this, 'loading', false);
      });
    },
    search(val) {
      if (!val) {
        set(this, 'data', get(this, 'rows'));

        return;
      }
      const data = get(this, 'rows') || [];

      const result = data.filter((d) => {
        return d.displayName.indexOf(val) > -1
          || d.cidr.indexOf(val) > -1
          || d.master.indexOf(val) > -1;
      });

      set(this, 'data', result);
    },
    sortChanged(sort) {
      const data = [...get(this, 'model.vlansubnets.data')];

      data.sort((a, b) => {
        if (a[sort.sortBy] > b[sort.sortBy]) {
          return sort.descending ? 1 : -1;
        }
        if (a[sort.sortBy] < b[sort.sortBy]) {
          return sort.descending ? -1 : 1;
        }

        return 0;
      });
      set(this, 'data', data);
    },
    promptDelete(data) {
      set(this, 'showConfirmDeleteModal', true)
      set(this, 'selectedData', data);
    },
    confirmDelete() {
      const data = get(this, 'selectedData');
      const clusterId = get(this, 'model.clusterId');

      const promises = data.map((d) => {
        return this.vlansubnet.removeVlansubnets(clusterId, d.name);
      });

      all(promises).then(() => {
        set(this, 'selectedData', null);
        set(this, 'showConfirmDeleteModal', false);
        this.send('refreshModel');
      }).catch((err) => {
        set(this, 'selectedData', null);
        set(this, 'showConfirmDeleteModal', false);
        get(this, 'growl').fromError(err && err.body && err.body.message);
        this.send('refreshModel');
      });
    },
    newVlansubent() {
      this.transitionToRoute('authenticated.cluster.vlansubnet.new', { queryParams: { copy_id: null } });
    },
    handleMenuClick(command, data) {
      switch (command) {
      case 'remove':
        this.send('promptDelete', [data]);
        break;
      case 'edit':
        this.transitionToRoute('authenticated.cluster.vlansubnet.edit', data.name);
        break;
      case 'clone':
        this.transitionToRoute('authenticated.cluster.vlansubnet.new', { queryParams: { copy_id: data.name } });
        break;
      }
    },
    selectChange(val) {
      set(this, 'ns', val);
    },
  },
  vlansubnetsDidChanged: observer('rows', function() {
    set(this, 'data', get(this, 'rows'));
  }),
  rows: computed('model.vlansubnets.data', function() {
    return get(this, 'model.vlansubnets.data');
  }),
  next: computed('model.vlansubnets.continue', function() {
    return get(this, 'model.vlansubnets.continue');
  }),
})
