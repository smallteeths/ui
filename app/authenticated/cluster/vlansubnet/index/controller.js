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
    width:          70
  },
  {
    name:           'cidr',
    label:          'CIDR',
    sort:           ['cidr'],
    searchField:    'cidr',
    width:          140,
  },
  {
    name:           'ipRanges',
    translationKey: 'formVlan.ipRange.label',
    width:          260,
  },
  {
    name:           'routes',
    translationKey: 'formVlan.route.label',
    width:          170,
  },
  {
    name:           'gateway',
    translationKey: 'formVlan.gateway.label',
    sort:           ['gateway'],
    searchField:    'gateway',
    width:          120,
  },
];

export default Controller.extend({
  growl:                  service(),
  vlansubnet:             service(),
  scope:                  service(),
  router:                 service(),
  session:                service(),
  intl:                   service(),
  sortBy:                 'name',
  headers,
  data:                   [],
  infoTotal:              1000,
  loading:                false,
  showConfirmDeleteModal: false,
  selectedData:           null,
  infos:                  null,
  infosLoading:           false,
  deleteTime:             null,
  availableActions:       [
    {
      action:         'remove',
      icon:           'icon icon-trash',
      label:          'action.remove',
    },
  ],
  rowActions:             [
    {
      action:         'edit',
      icon:           'icon icon-edit',
      label:          'action.edit',
      bulkable:       false,
      single:         true,
    },
    {
      action:         'clone',
      icon:           'icon icon-copy',
      label:          'action.clone',
    },
    {
      action:         'remove',
      icon:           'icon icon-trash',
      label:          'action.remove',
    }
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
      const clusterId = get(this, 'model.clusterId');
      const timestamp = new Date().getTime();
      const promiseAll = data.map(({ name }) => {
        return this.getPods(clusterId, name);
      });

      set(this, 'infos', null);
      set(this, 'infosLoading', true);
      set(this, 'showConfirmDeleteModal', true);
      set(this, 'selectedData', data);
      set(this, 'deleteTime', timestamp);
      this.getPodInfoList(promiseAll, timestamp).then(({ pods, timestamp }) => {
        if (get(this, 'deleteTime') !== timestamp){
          return;
        }
        set(this, 'infos', pods);
        set(this, 'infosLoading', false)
      });
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
  async getPodInfoList(promiseAll, timestamp){
    return await Promise.all(promiseAll).then((results) => {
      return {
        pods: results,
        timestamp
      };
    }).catch((err) => {
      get(this, 'growl').fromError(err && err.body && err.body.message);

      return {
        pods: [],
        timestamp
      };
    });
  },
  displayMacvlanIp(a) {
    const networkStatusStr = a && a['k8s.v1.cni.cncf.io/networks-status'];

    if (!networkStatusStr) {
      return '';
    }
    let networkStatus;

    try {
      networkStatus = JSON.parse(networkStatusStr);
    } catch (err) {
      return '';
    }
    if (networkStatus) {
      const macvlan = networkStatus.find((n) => n.interface === 'eth1');
      const labels = get(this, 'labels');
      const type = labels && labels['macvlan.panda.io/macvlanIpType'];

      return `${ (macvlan && macvlan.ips && macvlan.ips[0]) || '' }${ type ? ` (${ type })` : '' }`;
    }

    return '';
  },
  getPods(clusterId, name) {
    return get(this, 'vlansubnet').fetchPods(clusterId, name).then((resp) => {
      if (!resp.body || !resp.body.items) {
        return [];
      }

      let more  = false;
      let morePods = [];
      const pods     = Array.from(resp.body.items).filter(({ metadata }) => metadata && metadata.annotations && this.displayMacvlanIp(metadata.annotations)
      ).map(({ metadata }) => {
        return {
          namespace: metadata.namespace,
          name:      metadata.name,
          ip:        this.displayMacvlanIp(metadata.annotations)
        }
      });

      if (pods.length > 5) {
        more = true;
        morePods = pods.splice(5, pods.length - 1)
      }

      return {
        subnet: name,
        pods,
        more,
        morePods
      };
    }).catch((err) => {
      get(this, 'growl').fromError(err && err.body && err.body.message);

      return [];
    });
  },
})
