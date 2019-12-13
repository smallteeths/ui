import { inject as service } from '@ember/service';
import Controller from '@ember/controller';
import { get, computed } from '@ember/object';
import { isEmpty } from '@ember/utils';
import C from 'ui/utils/constants';

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
}

export default Controller.extend({

  scope:   service(),
  router:  service(),
  intl:    service(),

  quotaTypeArray: computed('C.QUOTA_TPYE_CN.[]', 'model.quotaSetting.limit', 'model.namespaces.[]', function() {
    let quotaData = [];
    const intl = get(this, 'intl');

    C.QUOTA_TPYE_CN.forEach((key) => {
      let quotaState = 'limit';

      if (key === 'requestsCpu' || key === 'requestsMemory' || key === 'requestsStorage') {
        quotaState = 'reserved';
      } else if (key === 'requestsGpuMemory' || key === 'requestsGpuCount'){
        quotaState = '';
      }
      if (get(this, 'model.quotaSetting') && get(this, 'model.quotaSetting.limit')  && get(this, 'model.quotaSetting.limit')[key]) {
        quotaData.push({
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

  currentNamespace: computed('model.namespaces.[]', function() {
    let ns = get(this, 'model.namespaces');
    let pId = get(this, 'scope.currentProject.id');
    let nsQuotasArray = ns.filter( (n) => get(n, 'projectId') === pId || isEmpty(get(n, 'projectId')))
    let currentNamespace = null

    if ( nsQuotasArray && nsQuotasArray.length > 0 ) {
      nsQuotasArray.forEach((n) => {
        if (n.name === get(this, 'model.name')) {
          currentNamespace = n;
        }
      })
    }

    return currentNamespace
  }),

});
