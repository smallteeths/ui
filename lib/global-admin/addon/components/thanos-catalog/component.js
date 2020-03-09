import Component from '@ember/component';
import layout from './template';
import { get, computed, setProperties, set } from '@ember/object';
import { inject as service } from '@ember/service';
import CrudCatalog from 'shared/mixins/crud-catalog';
import { convertToMillis } from 'shared/utils/util';
import { parseSi } from 'shared/utils/parse-unit'
import ReservationCheck from 'shared/mixins/reservation-check';
import CatalogUpgrade from 'shared/mixins/catalog-upgrade';
import C from 'ui/utils/constants';
import { answers as s3Answers }  from 'global-admin/components/thanos-storage-providers/aws-s3/component';
import { answers as ossAnswers }  from 'global-admin/components/thanos-storage-providers/aliyun-oss/component';

const WORKLOADS_RESOURCE_KEY = ['grafana.resources.core', 'thanos.query.resources', 'thanos.compact.resources', 'thanos.store.resources']
const WORKLOADS_WITHOUT_STORAGE_RESOURCE_KEY = ['grafana.resources.core', 'thanos.query.resources']
const THANOS_QUERY_REQUEST_CPU = 'thanos.query.resources.requests.cpu'
const THANOS_QUERY_REQUEST_MEM = 'thanos.query.resources.requests.memory'
const THANOS_QUERY_LIMIT_CPU = 'thanos.query.resources.limits.cpu'
const THANOS_QUERY_LIMIT_MEM = 'thanos.query.resources.limits.memory'
const THANOS_QUERY_NODE_SELECTOR_PREFIX = 'thanos.query.nodeSelector.'
const THANOS_QUERY_TOLERATION = 'thanos.query.tolerations'
const THANOS_QUERY_UI_SVC = 'thanos.query.service.type'
const THANOS_STORE_REQUEST_CPU = 'thanos.store.resources.requests.cpu'
const THANOS_STORE_REQUEST_MEM = 'thanos.store.resources.requests.memory'
const THANOS_STORE_LIMIT_CPU = 'thanos.store.resources.limits.cpu'
const THANOS_STORE_LIMIT_MEM = 'thanos.store.resources.limits.memory'
const THANOS_STORE_NODE_SELECTOR_PREFIX = 'thanos.store.nodeSelector.'
const THANOS_STORE_TOLERATION = 'thanos.store.tolerations'
const THANOS_STORE_ENABLED = 'thanos.store.enabled'

const THANOS_COMPACT_REQUEST_CPU = 'thanos.compact.resources.requests.cpu'
const THANOS_COMPACT_REQUEST_MEM = 'thanos.compact.resources.requests.memory'
const THANOS_COMPACT_LIMIT_CPU = 'thanos.compact.resources.limits.cpu'
const THANOS_COMPACT_LIMIT_MEM = 'thanos.compact.resources.limits.memory'
const THANOS_COMPACT_NODE_SELECTOR_PREFIX = 'thanos.compact.nodeSelector.'
const THANOS_COMPACT_TOLERATION = 'thanos.compact.tolerations'
const THANOS_COMPACT_ENABLED =  'thanos.compact.enabled'

const GRAFANA_REQUEST_CPU = 'grafana.resources.core.requests.cpu'
const GRAFANA_REQUEST_MEM = 'grafana.resources.core.requests.memory'
const GRAFANA_LIMIT_CPU = 'grafana.resources.core.limits.cpu'
const GRAFANA_LIMIT_MEM = 'grafana.resources.core.limits.memory'
const GRAFANA_NODE_SELECTOR_PREFIX = 'grafana.nodeSelector.'
const GRAFANA_TOLERATION = 'grafana.tolerations'
const GRAFANA_PV_ENABLED = 'grafana.persistence.enabled'
const GRAFANA_DASHBOARD = 'grafana.sidecar.dashboards.enabled'
const GRAFANA_PV_SIZE = 'grafana.persistence.size'
const GRAFANA_SC = 'grafana.persistence.storageClass'
const GRAFANA_UI_SVC = 'grafana.service.type'
const OBJECT_STORAGE_PROVIDER_TYPE = 'thanos.objectConfig.type'
const DASHBOARD_UI_NODE_SELECTOR_PREFIX = 'ui.nodeSelector.'
const DASHBOARD_UI_TOLERATION = 'ui.tolerations'
const DASHBOARD_UI_SVC = 'ui.service.type'
const CLUSTER_IP = 'ClusterIP'
const NODE_PORT = 'NodePort'
const LOAD_BALANCER = 'LoadBalancer'
const ANSWER_TO_CONFIG = {
  [THANOS_QUERY_REQUEST_CPU]:   'queryRequestCpu',
  [THANOS_QUERY_REQUEST_MEM]:   'queryRequestMemory',
  [THANOS_QUERY_LIMIT_MEM]:     'queryLimitMemory',
  [THANOS_QUERY_LIMIT_CPU]:     'queryLimitCpu',
  [THANOS_STORE_REQUEST_CPU]:   'storeRequestCpu',
  [THANOS_STORE_REQUEST_MEM]:   'storeRequestMemory',
  [THANOS_STORE_LIMIT_MEM]:     'storeLimitMemory',
  [THANOS_STORE_LIMIT_CPU]:     'storeLimitCpu',
  [THANOS_COMPACT_REQUEST_CPU]: 'compactRequestCpu',
  [THANOS_COMPACT_REQUEST_MEM]: 'compactRequestMemory',
  [THANOS_COMPACT_LIMIT_MEM]:   'compactLimitMemory',
  [THANOS_COMPACT_LIMIT_CPU]:   'compactLimitCpu',
  [THANOS_QUERY_UI_SVC]:        'queryServiceType',
  [GRAFANA_REQUEST_CPU]:        'grafanaRequestCpu',
  [GRAFANA_REQUEST_MEM]:        'grafanaRequestMemory',
  [GRAFANA_LIMIT_MEM]:          'grafanaLimitMemory',
  [GRAFANA_LIMIT_CPU]:          'grafanaLimitCpu',
  [GRAFANA_PV_ENABLED]:         'enableGrafanaPersistence',
  [GRAFANA_DASHBOARD]:          'enableGrafanaSidecar',
  [GRAFANA_UI_SVC]:             'grafanaServiceType',
  [GRAFANA_PV_SIZE]:            'grafanaPersistenceSize',
  [GRAFANA_SC]:                 'grafanaStorageClass',
}
const HIDDEN_KEYS = ['clusterIds', 'rancherHostname', 'token', 'apiToken', 'ui.service.type', THANOS_COMPACT_ENABLED, THANOS_STORE_ENABLED]
const WORKLOADS = ['query', 'grafana', 'store', 'compact'];
const WORKLOADS_WITHOUT_STORAGE = ['query', 'grafana']
const APP_NAME = 'global-monitoring';
const APP_NAMESPACE = 'cattle-global-data';
const APP_TEMPLATE_NAME = 'rancher-thanos'
const APP_TEMPLATE = 'system-library-rancher-thanos';
const GLOBAL_MONITORING_SVC = 'access-dashboard';
const GRAFANA_SVC = 'access-grafana';
const THANOS_SVC = 'access-thanos';
const DEFAULT_MIN_MEMORY = 512;
const WARNING_PREFIX = 'globalMonitoringPage.insufficientSize.total'
const SERVICE_TYPES = [
  {
    label: 'globalMonitoringPage.svc.clusterIp',
    value: CLUSTER_IP
  },
  {
    label: 'globalMonitoringPage.svc.nodePort',
    value: NODE_PORT
  },
  {
    label: 'globalMonitoringPage.svc.loadBalancer',
    value: LOAD_BALANCER
  }
];
const OBJECT_STORAGE_PROVIDERS = [
  {
    label:    'globalMonitoringPage.store.aliyunoss.label',
    value:    'aliyun-oss',
    provider: 'ALIYUNOSS',
    answers:  ossAnswers,
  },
  {
    label:    'globalMonitoringPage.store.s3.label',
    value:    'aws-s3',
    provider: 'S3',
    answers:  s3Answers,
  }
];

export default Component.extend(CrudCatalog, ReservationCheck, CatalogUpgrade, {
  scope:        service(),
  settings:     service(),
  intl:         service(),

  layout,

  answers:                null,
  appName:                APP_NAME,
  nsName:                 APP_NAMESPACE,
  templateId:             APP_TEMPLATE,
  templateName:           APP_TEMPLATE_NAME,
  updatingApp:            true,
  serviceTypes:           SERVICE_TYPES,
  objectStorageEnabled:   false,
  projectLevelMinMemory:  DEFAULT_MIN_MEMORY,
  warningPrefix:          WARNING_PREFIX,
  objectStorageProviders: OBJECT_STORAGE_PROVIDERS,
  selectedProvider:       'aws-s3',
  cluster:                null,

  init() {
    this._super(...arguments);

    this.initConfig();
    this.initWorkloads();

    if ( this.enabled ) {
      this.initAnswers();
    }
  },

  actions: {
    save(cb) {
      set(this, 'errors', [])
      const errors = this.validate() || []

      if (this.objectStorageEnabled) {
        errors.pushObjects(this.config.objectStorageConfigErrors || []);
      }

      if (errors.length > 0) {
        set(this, 'errors', errors)
        cb()

        return
      }

      let answers = {};

      HIDDEN_KEYS.forEach((key) => {
        const ans = get(this, 'app.answers') || {};

        if ( ans[key] ) {
          answers[key] = ans[key];
        }
      })

      const answerKeys = Object.keys(ANSWER_TO_CONFIG) || []

      answerKeys.map((key) => {
        const value = get(this, `config.${ ANSWER_TO_CONFIG[key] }`)

        if ( value === undefined || value === '' ) {
          return;
        }

        switch (key) {
        case THANOS_QUERY_REQUEST_CPU:
        case THANOS_QUERY_LIMIT_CPU:
        case THANOS_STORE_REQUEST_CPU:
        case THANOS_STORE_LIMIT_CPU:
        case THANOS_COMPACT_REQUEST_CPU:
        case THANOS_COMPACT_LIMIT_CPU:
        case GRAFANA_REQUEST_CPU:
        case GRAFANA_LIMIT_CPU:
          answers[key] = `${ value }m`
          break;
        case THANOS_QUERY_REQUEST_MEM:
        case THANOS_QUERY_LIMIT_MEM:
        case THANOS_STORE_REQUEST_MEM:
        case THANOS_STORE_LIMIT_MEM:
        case THANOS_COMPACT_REQUEST_MEM:
        case THANOS_COMPACT_LIMIT_MEM:
        case GRAFANA_REQUEST_MEM:
        case GRAFANA_LIMIT_MEM:
          answers[key] = `${ value }Mi`
          break;
        case GRAFANA_PV_ENABLED:
        case GRAFANA_DASHBOARD:
          answers[key] = `${ value }`;
          break;
        case GRAFANA_SC:
          answers[key] =  `${ value === null ? 'default' : value }`;
          break;
        default:
          answers[key] = value
        }
      });

      answers[THANOS_COMPACT_ENABLED] = !!this.objectStorageEnabled;
      answers[THANOS_STORE_ENABLED] = !!this.objectStorageEnabled;

      answers[DASHBOARD_UI_SVC] = answers[GRAFANA_UI_SVC];

      WORKLOADS.map((component) => {
        (get(this, `${ component }Tolerations`) || []).map((t, index) => {
          Object.keys(t).map((key) => {
            if (t[key]) {
              answers[`${ component !== 'grafana' ? `thanos.${  component }` : component }.tolerations[${ index }].${ key }`] = t[key]
              if ( component === 'grafana' ) {
                answers[`ui.tolerations[${ index }].${ key }`] = t[key]
              }
            }
          })
        });
      });

      WORKLOADS.map((component) => {
        (get(this, `${ component }NodeSelectors`) || []).map((selector) => {
          let { key, value } = selector

          if (key.includes('.')) {
            key = key.replace(/\./g, '\\.')
          }
          answers[`${ component !== 'grafana' ? `thanos.${  component }` : component }.nodeSelector.${ key }`] = value
          if ( component === 'grafana' ) {
            answers[`ui.nodeSelector.${ key }`] = value
          }
        });
      })

      if ( this.objectStorageEnabled ) {
        const provider = OBJECT_STORAGE_PROVIDERS.findBy('value', this.selectedProvider) || {};

        answers[OBJECT_STORAGE_PROVIDER_TYPE] = provider.provider;
        Object.keys(this.config.objectStorageConfig || {}).forEach((key) => {
          answers[key] = this.config.objectStorageConfig[key];
        });
      } else {
        this.removeKeys(answers, 'thanos.objectConfig');
        this.removeKeys(answers, 'thanos.store');
        this.removeKeys(answers, 'thanos.compact');
        this.removeKeys(this.customAnswers, 'thanos.objectConfig');
      }

      this.save(cb, answers);
      if ( !this.enabled ) {
        this.setGlobalMonitoringEnabledSetting(true);
        set(this, 'updatingApp', false)
      } else {
        set(this, 'updatingApp', true)
      }
    },

    disable() {
      this._super();
      this.setGlobalMonitoringEnabledSetting(false);
    },
  },

  objectStorageProvider: computed('selectedProvider', function() {
    return `thanos-storage-providers/${ this.selectedProvider }`
  }),

  globalMonitoringUrl: computed('cluster.id', function() {
    return `/k8s/clusters/${ this.cluster.id }/api/v1/namespaces/${ APP_NAMESPACE }/services/http:${ GLOBAL_MONITORING_SVC }:80/proxy/`
  }),

  grafanaUrl: computed('cluster.id', function() {
    return `/k8s/clusters/${ this.cluster.id }/api/v1/namespaces/${ APP_NAMESPACE }/services/http:${ GRAFANA_SVC }:80/proxy/`
  }),

  thanosUrl: computed('cluster.id', function() {
    return `/k8s/clusters/${ this.cluster.id }/api/v1/namespaces/${ APP_NAMESPACE }/services/http:${ THANOS_SVC }:80/proxy/`
  }),

  saveDisabled: computed('enabled', 'templateVersion', 'grafanaWarning', 'queryWarning', 'storeWarning', 'compactWarning', 'totalWarning', 'objectStorageEnabled', function() {
    return !this.templateVersion || [...this.getWorkloads()].reduce((out, w) => out || (get(this, `${ w }Warning`) || false), false) || this.totalWarning
  }),

  requestsCpu: computed('config.queryRequestCpu', 'config.storeRequestCpu', 'config.compactRequestCpu', 'config.grafanaRequestCpu', 'objectStorageEnabled', function() {
    return this.getWorkloads().reduce((all, w) => {
      return all + parseInt(get(this, `config.${ w }RequestCpu`) || 0)
    }, 0)
  }),

  requestsMemory: computed('config.queryRequestMemory', 'config.storeRequestMemory', 'config.compactRequestMemory', 'config.grafanaRequestMemory', 'objectStorageEnabled', function() {
    return this.getWorkloads().reduce((all, w) => {
      return all + parseInt(get(this, `config.${ w }RequestMemory`) || 0)
    }, 0)
  }),

  chartVersions: computed('availableVersions', 'templateLables', function() {
    const { availableVersions = [], templateLables = {} } = this

    return availableVersions.map((v) => {
      const key = `rancher.thanos.v${ v.value }`

      return {
        label: `${ v.label } (Thanos ${ templateLables[key] })`,
        value: v.value,
      }
    })
  }),

  initConfig() {
    const config = {
      queryRequestCpu:          500,
      queryRequestMemory:       1024,
      queryLimitCpu:            1000,
      queryLimitMemory:         2048,
      storeRequestCpu:          500,
      storeRequestMemory:       1024,
      storeLimitCpu:            1000,
      storeLimitMemory:         2048,
      compactRequestCpu:        500,
      compactRequestMemory:     1024,
      compactLimitCpu:          1000,
      compactLimitMemory:       2048,
      grafanaRequestCpu:        100,
      grafanaRequestMemory:     256,
      grafanaLimitCpu:          300,
      grafanaLimitMemory:       512,
      enableGrafanaPersistence: false,
      enableGrafanaSidecar:     false,
      queryServiceType:         CLUSTER_IP,
      grafanaServiceType:       CLUSTER_IP,
      grafanaPersistenceSize:   '10Gi',
      grafanaStorageClass:      null,
    }

    set(this, 'config', config);
  },

  initAnswers() {
    let customAnswers = {};

    const answers = get(this, 'app.answers') || {};
    const answerKeys = Object.keys(ANSWER_TO_CONFIG) || []

    this.initSelectorsAndTolerations(answers, 'query', THANOS_QUERY_NODE_SELECTOR_PREFIX, THANOS_QUERY_TOLERATION);
    this.initSelectorsAndTolerations(answers, 'store', THANOS_STORE_NODE_SELECTOR_PREFIX, THANOS_STORE_TOLERATION);
    this.initSelectorsAndTolerations(answers, 'compact', THANOS_COMPACT_NODE_SELECTOR_PREFIX, THANOS_COMPACT_TOLERATION);
    this.initSelectorsAndTolerations(answers, 'grafana', GRAFANA_NODE_SELECTOR_PREFIX, GRAFANA_TOLERATION);

    this.updateCpuMemoryPreRequest()

    set(this, 'objectStorageEnabled', answers[THANOS_STORE_ENABLED] === 'true');
    let objectStorageAnswersArrary = [];

    if ( this.objectStorageEnabled ) {
      const provider = OBJECT_STORAGE_PROVIDERS.findBy('provider', answers[OBJECT_STORAGE_PROVIDER_TYPE] || 'S3') || {};

      set(this, 'selectedProvider', provider.value || 'aws-s3');
      const objectStorageAnswers = provider.answers || {};

      objectStorageAnswersArrary = Object.keys(objectStorageAnswers).map((key) => objectStorageAnswers[key]);

      const objectStorageConfig = {}

      objectStorageAnswersArrary.forEach((key) => {
        if (answers[key])  {
          objectStorageConfig[key] = answers[key]
        }
      });

      set(this, 'config.objectStorageConfig', objectStorageConfig);
    }

    Object.keys(answers).filter((key) => (this.objectStorageEnabled && objectStorageAnswersArrary.indexOf(key) === -1) && OBJECT_STORAGE_PROVIDER_TYPE !== key).forEach((key = '') => {
      if (key.startsWith(THANOS_QUERY_NODE_SELECTOR_PREFIX)
          || key.startsWith(`${ THANOS_QUERY_TOLERATION }`)
      ) {
        return
      }

      if (key.startsWith(THANOS_STORE_NODE_SELECTOR_PREFIX)
      || key.startsWith(`${ THANOS_STORE_TOLERATION }`)
      ) {
        return
      }

      if (key.startsWith(THANOS_COMPACT_NODE_SELECTOR_PREFIX)
      || key.startsWith(`${ THANOS_COMPACT_TOLERATION }`)
      ) {
        return
      }

      if (key.startsWith(GRAFANA_NODE_SELECTOR_PREFIX)
      || key.startsWith(`${ GRAFANA_TOLERATION }`)
      ) {
        return
      }

      if (key.startsWith(DASHBOARD_UI_NODE_SELECTOR_PREFIX)
      || key.startsWith(`${ DASHBOARD_UI_TOLERATION }`)
      ) {
        return
      }

      if (HIDDEN_KEYS.includes(key)) {
        return
      }

      if (answerKeys.includes(key)) {
        let value

        switch (key) {
        case THANOS_QUERY_REQUEST_CPU:
        case THANOS_QUERY_LIMIT_CPU:
        case THANOS_STORE_REQUEST_CPU:
        case THANOS_STORE_LIMIT_CPU:
        case THANOS_COMPACT_REQUEST_CPU:
        case THANOS_COMPACT_LIMIT_CPU:
        case GRAFANA_REQUEST_CPU:
        case GRAFANA_LIMIT_CPU:
          value = convertToMillis(answers[key] || '0')
          break;
        case THANOS_QUERY_REQUEST_MEM:
        case THANOS_QUERY_LIMIT_MEM:
        case THANOS_STORE_REQUEST_MEM:
        case THANOS_STORE_LIMIT_MEM:
        case THANOS_COMPACT_REQUEST_MEM:
        case THANOS_COMPACT_LIMIT_MEM:
        case GRAFANA_REQUEST_MEM:
        case GRAFANA_LIMIT_MEM:
          value = parseSi(answers[key] || '0', 1024) / 1048576
          break;
        case GRAFANA_PV_ENABLED:
        case GRAFANA_DASHBOARD:
          value = answers[key] === 'true';
          break;
        case GRAFANA_SC:
          value = answers[key] === 'default' ? null : answers[key]
          break;
        default:
          value = answers[key]
        }

        return set(this, `config.${ ANSWER_TO_CONFIG[key] }`, value)
      }

      customAnswers[key] = answers[key];
      setProperties(this, { customAnswers, })
    });
  },

  getWorkloads() {
    return this.objectStorageEnabled ? WORKLOADS : WORKLOADS_WITHOUT_STORAGE;
  },

  getEnalbedWorkloads() {
    const answers = get(this, 'app.answers') || {};

    return answers[THANOS_STORE_ENABLED] === 'true' ? WORKLOADS : WORKLOADS_WITHOUT_STORAGE;
  },

  doneSaving() {
    this.updateCpuMemoryPreRequest()
  },

  setGlobalMonitoringEnabledSetting(value) {
    const enabled = this.globalStore.all('setting').findBy('id', C.SETTING.GLOBAL_MONITORING_ENABLED)

    set(enabled, 'value', value)
    enabled.save();
  },

  removeKeys(answers, prefix) {
    Object.keys(answers || {}).filter((key) => key.startsWith(prefix)).forEach((key) => delete answers[key]);
  },

  updateCpuMemoryPreRequest() {
    const answers = get(this, 'app.answers') || {};
    const workloads = answers[THANOS_STORE_ENABLED] === 'true' ? WORKLOADS_RESOURCE_KEY : WORKLOADS_WITHOUT_STORAGE_RESOURCE_KEY

    const preRequestsCpu = workloads.reduce((all, current) => {
      const value = answers[`${ current }.requests.cpu`]

      return value ? all + convertToMillis(value) : all
    }, 0)

    const preRequestsMemory = workloads.reduce((all, current) => {
      const value = answers[`${ current }.requests.memory`]

      return value ? all + parseSi(value) / 1048576 : all
    }, 0)

    setProperties(this, {
      preRequestsCpu,
      preRequestsMemory,
    })
  },
});
