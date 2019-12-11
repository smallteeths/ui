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
  infoTotal:                1000,
  loading:                false,
  showConfirmDeleteModal: false,
  selectedData:           null,
  infos:                  [],
  deleteTime:               null,
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
      let nameList = '';
      const promisAll = data.map(({ name }, index) => {
        if (index <= 5) {
          nameList += `${ name };`
        }

        return this.getPods(clusterId, name);
      });

      if (data.length > 5){
        nameList = `${ data.firstObject.name }及${ data.length - 1 }其他`;
      }
      set(this, 'showConfirmDeleteModal', true);
      set(this, 'infos', [{ displayName: nameList }]);
      set(this, 'selectedData', data);
      set(this, 'deleteTime', timestamp);
      this.getPodInfoList(promisAll, timestamp).then(({ pods, timestamp }) => {
        if (get(this, 'deleteTime') !== timestamp){
          return;
        }
        let length = pods.length - 1;

        if (pods.length > 14){
          pods.length = 14;
          get(this, 'infos').push(...pods, { displayName: `············` }, { displayName: `${ length > 200 ? '正在使用pod 共 200 条以上' : `正在使用pod 共 ${ length } 条` }` });
        } else {
          get(this, 'infos').push(...pods, { displayName: `正在使用pod 共 ${ length } 条` });
        }
        set(this, 'infos', JSON.parse(JSON.stringify(get(this, 'infos'))));
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
  async getPodInfoList(promisAll, timestamp){
    return await Promise.all(promisAll).then((results) => {
      let pods = results.reduce((a, b) => {
        return a.concat(b);
      }, [{ displayName: '-----------------------------' }]);

      return {
        pods,
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

      return Array.from(resp.body.items).filter(({ metadata }) => metadata && metadata.annotations && this.displayMacvlanIp(metadata.annotations)
      ).map(({ metadata, displayName }) => {
        displayName = `${ metadata.namespace }/${ metadata.name } [${ this.displayMacvlanIp(metadata.annotations) }]`

        return { displayName }
      });
    }).catch((err) => {
      get(this, 'growl').fromError(err && err.body && err.body.message);

      return [];
    });
  },
})
