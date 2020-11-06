import { inject as service } from '@ember/service';
import Controller from '@ember/controller';
import { get, computed } from '@ember/object';
import { convertToLimit } from 'shared/utils/quota-unit';
import { isEmpty } from '@ember/utils';
import C from 'ui/utils/constants';

export const headers = [
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
    translationKey: 'namespacesPage.table.name.label',
  },
  {
    classNames:     'text-right pr-20',
    name:           'created',
    sort:           ['created', 'id'],
    searchField:    false,
    translationKey: 'namespacesPage.table.created.label',
    width:          250,
  },
];

export const quotaName = {
  requestsCpu:            'CPU',
  limitsCpu:              'CPU',
  requestsMemory:         'Memory',
  limitsMemory:           'Memory',
  servicesNodePorts:      'NodePorts',
  servicesLoadBalancers:  'LoadBalancers',
  persistentVolumeClaims: 'PVC',
  configMaps:             'Config Maps',
  requestsStorage:        'Storage',
  pods:                   'Pods',
  services:               'Services',
  secrets:                'Secrets',
  replicationControllers: 'Replication Controllers',
  requestsGpuMemory:      'GPU Memory',
  requestsGpuCount:       'GPU Count',

  requestsStorageClassStorage: 'StorageClass Storage',
  requestsStorageClassPVC:     'StorageClassPVC',
}

export default Controller.extend({

  scope:   service(),
  router:  service(),
  session: service(),
  intl:    service(),
  sortBy:  'name',
  headers,

  storageClassKey: ['requestsStorageClassStorage', 'requestsStorageClassPVC'],

  quotaTypeArray: computed('C.QUOTA_TPYE_CN.[]', 'model.quotaSetting.limit', 'allNamespace', function() {
    let quotaData = [];
    const intl = get(this, 'intl');
    const storageClassKey = get(this, 'storageClassKey');

    C.QUOTA_TPYE_CN.forEach((key) => {
      let quotaState = 'limit';

      if (storageClassKey.find((scKey) => scKey === key)){
        this.initStorageClassQuota(key, quotaData);

        return;
      }
      if (key === 'requestsCpu' || key === 'requestsMemory' || key === 'requestsStorage') {
        quotaState = 'reserved';
      } else if (key === 'requestsGpuMemory' || key === 'requestsGpuCount'){
        quotaState = '';
      }
      if (get(this, 'model.quotaSetting') && get(this, 'model.quotaSetting.limit')  && get(this, 'model.quotaSetting.limit')[key]) {
        quotaData.push({
          namespaceQuotas: get(this, 'allNamespace')[key],
          usedProp:        get(this, 'model.quotaSetting.used')[key] ? get(this, 'model.quotaSetting.used')[key] : '0',
          quotaKey:        key,
          quotaName:       quotaName[key],
          quotaState:      quotaState ? intl.t(`quotasCn.common.${ quotaState }`) : '',
          quotaTotal:      get(this, 'model.quotaSetting.limit')[key],
        })
      }
    })

    return quotaData;
  }),

  allNamespace: computed('model.namespaces.[]', function() {
    let ns = get(this, 'model.namespaces');
    let pId = get(this, 'scope.currentProject.id');
    let nsQuotasArray = ns.filter( (n) => get(n, 'projectId') === pId && !isEmpty(get(n, 'projectId')))
    let namespacesData = {}
    const storageClassKey = get(this, 'storageClassKey');

    C.QUOTA_TPYE_CN.forEach((key) => {
      if (storageClassKey.find((scKey) => scKey === key)){
        namespacesData[key] = {};

        return;
      }
      namespacesData[key] = [];
    })

    if (nsQuotasArray && nsQuotasArray.length > 0) {
      nsQuotasArray.forEach((item) => {
        if (item && item.resourceQuota && item.resourceQuota.limit) {
          let itemQuotas    = item.resourceQuota.limit;
          let itemQuotaUsed = undefined

          if (item.annotations[C.QUOTA_USED]) {
            itemQuotaUsed = JSON.parse(item.annotations[C.QUOTA_USED])
          }

          C.QUOTA_TPYE_CN.forEach((key) => {
            if (storageClassKey.find((scKey) => scKey === key)){
              Object.keys(itemQuotas[key]).forEach((subKey) => {
                let formatData = this.formatSCQuotas( key, itemQuotaUsed, itemQuotas, item.name, subKey);

                if (formatData) {
                  !namespacesData[key][subKey] && (namespacesData[key][subKey] = []);
                  namespacesData[key][subKey].push(formatData)
                }
              });

              return;
            }
            let formatData = this.formartQuotas(key, itemQuotaUsed, itemQuotas, item.name);

            if (formatData) {
              namespacesData[key].push(formatData)
            }
          })
        }
      })
    }

    return namespacesData;
  }),

  projectNamespaces: computed('model.namespaces', function() {
    return get(this, 'model.namespaces').filter( (ns) => get(ns, 'projectId') === get(this, 'scope.currentProject.id'));
  }),

  projectlessNamespaces: computed('model.namespaces', function() {
    return get(this, 'model.namespaces').filter( (ns) => isEmpty(get(ns, 'projectId')) );
  }),

  hasPermissions: computed('model.users.[]', function() {
    let currentUser = get(this, 'model.users').filter( (item) => item.me ).length > 0 ? get(this, 'model.users').filter( (item) => item.me )[0] : null;

    if (currentUser && currentUser.clusterRoleBindings && currentUser.clusterRoleBindings.length > 0) {
      return currentUser.clusterRoleBindings.some((item) => {
        return item.clusterId === get(this, 'model.clusterId') && (item.roleTemplateId === 'cluster-owner' || item.roleTemplateId === 'cluster-member')
      })
    }

    if (currentUser.hasAdmin) {
      return true
    }

    return false;
  }),

  formartQuotas(key, dataInNS, data, name) {
    if (data[key] && get(this, `model.quotaSetting.limit.${ key }`)) {
      let used        = parseInt(convertToLimit(key, data[key]), 10);
      let total       = parseInt(convertToLimit(key, get(this, `model.quotaSetting.limit.${ key }`)), 10);
      let usedInNS    = 0;
      let totalInNS   = used;

      if (dataInNS) {
        usedInNS = parseInt(convertToLimit(key, dataInNS[key]), 10)
      }

      if (totalInNS === 0) {
        totalInNS = 1
      }

      return {
        name,
        used:        data[key],
        usedInNS,
        percent:     `${ Math.floor( (used / total) * 100 ) || 0 }%`,
        percentInNS: `${ Math.floor( (usedInNS / totalInNS) * 100 ) || 0 }%`,
        label:       key,
      }
    } else {
      return null
    }
  },
  formatSCQuotas(key, dataInNS, data, name, subKey){
    const quotaLimit = data[key] && data[key][subKey];
    const quotaUsed  = dataInNS[key] && dataInNS[key][subKey];
    const quotaTotal = get(this, `model.quotaSetting.limit.${ key }`);

    if (quotaLimit && get(this, `model.quotaSetting.limit.${ key }`)) {
      let used        = parseInt(convertToLimit(key, quotaLimit), 10);
      let total       = parseInt(convertToLimit(key, quotaTotal[subKey]), 10);
      let usedInNS    = 0;
      let totalInNS   = used;

      if (dataInNS) {
        usedInNS = parseInt(convertToLimit(key, quotaUsed), 10)
      }

      if (totalInNS === 0) {
        totalInNS = 1
      }

      return {
        name,
        subKey,
        used:        quotaLimit,
        usedInNS,
        percent:     `${ Math.floor( (used / total) * 100 ) || 0 }%`,
        percentInNS: `${ Math.floor( (usedInNS / totalInNS) * 100 ) || 0 }%`,
        label:       key,
      }
    } else {
      return null
    }
  },
  initStorageClassQuota(key, quotaData){
    const intl             = get(this, 'intl');
    const limit            = get(this, 'model.quotaSetting.limit');
    const used             = get(this, 'model.quotaSetting.used');
    const scQuota          = limit[key];
    const scUsed           = used[key];

    Object.keys(scQuota).forEach((subKey) => {
      const namespaceQuotas  = get(this, 'allNamespace')[key][subKey];

      if (get(this, 'model.quotaSetting') && get(this, 'model.quotaSetting.limit')  && get(this, 'model.quotaSetting.limit')[key]) {
        quotaData.push({
          namespaceQuotas,
          usedProp:        scUsed ? scUsed[subKey] : '0',
          quotaKey:        key,
          quotaSubKey:     subKey,
          quotaName:       quotaName[key],
          quotaState:      intl.t(`quotasCn.common.limit`),
          quotaTotal:      get(this, 'model.quotaSetting.limit')[key][subKey],
        })
      }
    })
  }
});
