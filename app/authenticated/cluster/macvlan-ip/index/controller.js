import { inject as service } from '@ember/service';
import Controller from '@ember/controller';
import { get, set, computed, observer } from '@ember/object';


const headers = [
  {
    name:           'name',
    sort:           ['name'],
    searchField:    'name',
    translationKey: 'generic.name',
  },
  {
    name:           'namespace',
    sort:           ['namespace'],
    searchField:    'namespace',
    translationKey: 'generic.namespace',
  },
  {
    name:           'cidr',
    label:          'Address',
    sort:           ['cidr'],
    searchField:    'ip',
    width:          150,
  },
  {
    name:           'mac',
    label:          'MAC',
    sort:           ['mac'],
    searchField:    'mac',
  },
  {
    name:           'podId',
    label:          'Pod ID',
    sort:           ['podId'],
    searchField:    'podId',
  },
  {
    name:           'subnet',
    label:          'Subnet',
  },
  {
    classNames:     'text-right pr-20',
    name:           'creationTimestamp',
    translationKey: 'generic.created',
    searchField:    false,
    width:          250,
  },
];

export default Controller.extend({
  vlansubnet:       service(),
  scope:            service(),
  router:           service(),
  session:          service(),
  prefs:            service(),
  queryParams:      ['subnet'],
  subnet:           '',
  sortBy:           'name',
  headers,
  data:             [],
  searchText:       '',
  availableActions: [],
  loading:          false,
  init() {
    this._super(...arguments);
    this.staticPodsDidChanged();
  },
  actions: {
    pageChange(next) {
      if (get(this, 'loading')) {
        return;
      }
      const clusterId = get(this, 'scope.currentCluster.id');
      const limit = get(this, 'prefs.tablePerPage') || 50;
      const subnet = get(this, 'subnet');
      const p = {
        limit,
        continue: next
      };

      if (subnet) {
        p.labelSelector = encodeURIComponent(`subnet=${ subnet }`);
      }
      set(this, 'loading', true);
      get(this, 'vlansubnet').fetchMacvlanIp(clusterId, p).then((resp) => {
        set(this, 'loading', false);
        const data = [...get(this, 'model.macvlanIps.data')];

        data.push(...resp.body.data);

        set(this, 'model.macvlanIps', {
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
          || d.namespace.indexOf(val) > -1
          || d.cidr.indexOf(val) > -1
          || d.subnet.indexOf(val) > -1;
      });

      set(this, 'data', result);
    },
    sortChanged(sort) {
      const data = [...get(this, 'model.macvlanIps.data')];

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
  },
  staticPodsDidChanged: observer('rows', function() {
    set(this, 'data', get(this, 'rows'));
  }),
  rows: computed('model.macvlanIps.data', function() {
    return get(this, 'model.macvlanIps.data');
  }),
  next: computed('model.macvlanIps.continue', function() {
    return get(this, 'model.macvlanIps.continue');
  }),
});
