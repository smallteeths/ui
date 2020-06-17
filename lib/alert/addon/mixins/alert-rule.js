import Mixin from '@ember/object/mixin';
import { get, set, setProperties, computed } from '@ember/object';
import { inject as service } from '@ember/service'
import { reads } from '@ember/object/computed';
import C from 'ui/utils/constants';

export default Mixin.create({
  scope:       service(),
  intl:        service(),
  globalStore: service(),
  growl:       service(),

  clusterId: reads('scope.currentCluster.id'),
  projectId: reads('scope.currentProject.id'),
  pageScope: reads('scope.currentPageScope'),


  init() {
    this._super(...arguments)
    const pageScope = get(this, 'pageScope');
    const globalStore = get(this, 'globalStore')
    const clusterId = get(this, 'clusterId')
    const cluster = globalStore.all('cluster').findBy('id', clusterId)
    const projectId = get(this, 'projectId')
    const alertRule = get(this, 'alertRule')
    let rules = get(this, 'alertRules')
    let url = `monitormetrics?action=list${ pageScope }metricname&limit=-1`
    let data = {}

    if (pageScope === 'cluster') {
      data = { clusterId }
    } else {
      data = { projectId }
    }

    if (get(this, 'monitoringEnabled')) {
      globalStore.rawRequest({
        url,
        method: 'POST',
        data,
      }).then((res = {}) => {
        const metrics = res && res.body && res.body.names

        set(this, 'metrics', metrics)
      }).catch((err = {}) => {
        get(this, 'growl').fromError(get(err, 'body.message'));
      });

      set(this, 'commonRules', C.COMMON_RULES.filter((item) => {
        if (item.scope !== pageScope) {
          return false
        }

        return !(item.onlyCustom && !get(cluster, 'rancherKubernetesEngineConfig'));
      }).map((item) => {
        return {
          ...item,
          label: `alertPage.commonRules.${ item.label }`,
        }
      }));
    }

    // if it is editing then init commonRule
    if (!get(this, 'alertRules')) {
      rules = [alertRule]
    } else {
      rules = rules.concat()
    }

    rules.forEach((rule, index) => {
      if (rule && get(rule, 'metricRule.description') === 'Common Rules') {
        set(rule, 'metricRule.commonRule', get(rule, 'metricRule.expression'))
        set(rule, 'metricRule.expression', '')
        set(rule, '_targetType', 'commonRules')
        set(rule, 'metricRule.unit', C.COMMON_RULES.findBy('value', get(rule, 'metricRule.commonRule')).unit)
        set(rules, index, rule)
      }

      if (rule && get(rule, 'metricRule.description') === 'Pod Reboot Times') {
        set(rule, 'metricRule.podRebootRule', get(rule, 'metricRule.expression'))
        set(rule, 'metricRule.expression', '')
        set(rule, '_targetType', 'podRebootRule')
        set(rule, 'metricRule.podRebootRuleLabels', this.getPodRebootRuleLabels(get(rule, 'metricRule.podRebootRule')))
        set(rule, 'metricRule.unit', C.POD_REBOOT_RULE.unit)
        set(rules, index, rule)
      }
    })

    if (get(this, 'alertRules')) {
      set(this, 'alertRules', rules)
    } else {
      set(this, 'alertRule', rules[0])
    }
  },

  monitoringEnabled: computed(function() {
    const ps = get(this, 'pageScope');

    if (ps === 'cluster') {
      return get(this, 'scope.currentCluster.enableClusterMonitoring')
    } else {
      return get(this, 'scope.currentProject.enableProjectMonitoring')
    }
  }),

  beforeSaveClusterAlert(alertRule, group) {
    const clone = alertRule.clone();

    setProperties(clone, {
      clusterId: get(this, 'scope.currentCluster.id'),
      groupId:   group.id,
    })

    const t = get(alertRule, '_targetType');
    const errors = get(this, 'errors') || [];
    const intl = get(this, 'intl');
    const selector = get(clone, 'nodeRule.selector') || {};
    const keys = Object.keys(selector);

    if (!get(clone, 'name')) {
      errors.push(intl.t('alertPage.newOrEdit.nameRequired'));
    }

    switch (t) {
    case 'node':
      if (!get(clone, 'nodeRule.nodeId')) {
        errors.push(intl.t('alertPage.newOrEdit.nodeRequired'));
      }

      if (get(clone, 'nodeRule.condition') === 'cpu') {
        delete clone.nodeRule.memThreshold
      } else if (get(clone, 'nodeRule.condition') === 'mem') {
        delete clone.nodeRule.cpuThreshold
      } else {
        delete clone.nodeRule.cpuThreshold
        delete clone.nodeRule.memThreshold
      }

      setProperties(clone, {
        'nodeRule.selector': null,
        systemServiceRule:   null,
        eventRule:           null,
        metricRule:          null,
        clusterScanRule:     null,
      });
      break;
    case 'nodeSelector':
      if (keys.length === 0) {
        errors.push(intl.t('alertPage.newOrEdit.nodeSelectorRequired'));
      }
      setProperties(clone, {
        'nodeRule.nodeId': null,
        systemServiceRule: null,
        eventRule:         null,
        metricRule:        null,
        clusterScanRule:   null,
      });
      break;
    case 'systemService':
      setProperties(clone, {
        nodeRule:        null,
        eventRule:       null,
        metricRule:      null,
        clusterScanRule:   null,
      });
      break;
    case 'warningEvent':
    case 'normalEvent':
      setProperties(clone, {
        nodeRule:          null,
        systemServiceRule: null,
        metricRule:        null,
        clusterScanRule:   null,
      });
      break;
    case 'metric':
      setProperties(clone, {
        nodeRule:          null,
        systemServiceRule: null,
        eventRule:         null,
        clusterScanRule:   null,
      });
      break;
    case 'cisScan':
      setProperties(clone, {
        nodeRule:          null,
        systemServiceRule: null,
        eventRule:         null,
        metricRule:        null,
      });
      break;
    case 'commonRules':
      setProperties(clone, {
        nodeRule:          null,
        systemServiceRule: null,
        eventRule:         null,
      })
      setProperties(get(clone, 'metricRule'), {
        description: 'Common Rules',
        expression:  get(clone, 'metricRule.commonRule'),
        commonRule:  null,
        unit:        null
      })
      break;
    }

    set(this, 'errors', errors);

    return clone;
  },

  beforeSaveProjectAlert(alertRule, group) {
    const intl = get(this, 'intl');
    const clone = alertRule.clone();
    const t = get(alertRule, '_targetType');
    const errors = get(this, 'errors') || [];
    const workloadType = get(clone, 'workloadRule.workloadType');
    const workloadSelectorType = get(clone, 'workloadRule.workloadSelectorType');
    const selector = get(clone, 'workloadRule.selector') || {};
    const keys = Object.keys(selector);

    setProperties(clone, {
      projectId: get(this, 'scope.currentProject.id'),
      groupId:   group.id,
    })

    if (!get(clone, 'name')) {
      errors.push(intl.t('alertPage.newOrEdit.nameRequired'));
    }

    switch (t) {
    case 'workload':
      setProperties(clone, {
        podRule:                 null,
        'workloadRule.selector': null,
        'workloadRule.type':     workloadType,
        metricRule:              null,
      });
      break;
    case 'workloadSelector':
      if (keys.length === 0) {
        errors.push('Workload selector required');
      }
      setProperties(clone, {
        podRule:                   null,
        'workloadRule.workloadId': null,
        'workloadRule.type':       workloadSelectorType,
        metricRule:                null,
      });
      break;
    case 'pod':
      setProperties(clone, {
        workloadRule: null,
        metricRule:   null,
      });
      break;
    case 'metric':
      setProperties(clone, {
        workloadRule: null,
        podRule:      null,
      });
      break;
    case 'commonRules':
      setProperties(clone, {
        workloadRule: null,
        podRule:      null,
      })
      setProperties(get(clone, 'metricRule'), {
        description: 'Common Rules',
        expression:  get(clone, 'metricRule.commonRule'),
        commonRule:  null,
        unit:        null
      })
      break;
    case 'podRebootRule':
      setProperties(clone, {
        workloadRule: null,
        podRule:      null,
      })
      setProperties(get(clone, 'metricRule'), {
        description:         'Pod Reboot Times',
        expression:          get(clone, 'metricRule.podRebootRule'),
        commonRule:          null,
        podRebootRule:       null,
        podRebootRuleLabels: null,
        unit:                null
      })
      break;
    }

    set(this, 'errors', errors);

    return clone;
  },

  willSaveMetricRule(toSaveAlert) {
    if (get(toSaveAlert, 'metricRule.comparison') === C.ALERTING_COMPARISON.HAS_VALUE) {
      delete get(toSaveAlert, 'metricRule').thresholdValue
    }

    return toSaveAlert
  },

  getPodRebootRuleLabels(expression) {
    let labels = expression.match(/label_[a-z_A-Z0-9]+="[a-z_A-Z0-9-\.!@#\$%\\\^&\*\)\(\+=\{\}\[\]\/",'<>~\·`\?:;|]+"/gi);
    const result = {};

    if (!labels) {
      return {};
    }

    labels = labels[0].split('",')

    labels.forEach((item, index) => {
      const start = item.indexOf('_')
      const end = item.indexOf('=')
      const key = item.substring(start + 1, end)
      // array split by < ", > the last item should remove < " >
      const value = item.substring(end + 2, item.length - (index === labels.length - 1 ? 1 : 0))

      result[key] = value
    })

    return result;
  }
});
