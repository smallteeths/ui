import {
  computed, get, observer, set, setProperties
} from '@ember/object';
import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { reads } from '@ember/object/computed';
import { htmlSafe } from '@ember/string';
import jsyaml from 'js-yaml';
import C from 'ui/utils/constants';

export default Component.extend({
  globalStore:         service(),
  scope:               service(),
  intl:                service(),

  chartOption:               null,
  monitoringEnabled:         false,
  condition:                 null,
  graphLoading:              null,
  graphStatus:               null,
  showAdvancedSection:        false,
  clustScanRuleFailuresOnly: 'false',

  clusterId: reads('scope.currentCluster.id'),

  init() {
    this._super(...arguments);
    const resourceKinds = get(this, 'globalStore')
      .getById('schema', 'eventrule')
      .optionsFor('resourceKind').sort()
      .map((value) => ({
        label: value,
        value,
      }));
    const systemServices = get(this, 'globalStore')
      .getById('schema', 'systemservicerule')
      .optionsFor('condition').sort()
      .map((value) => ({
        label: value,
        value,
      }));

    setProperties(this, {
      resourceKinds,
      systemServices,
      clustScanRuleFailuresOnly: get(this, 'model.clusterScanRule.failuresOnly') === true ? 'true' : 'false'
    })
    set(this, 'chartOption', get(this, 'chartOption'))
    this.expressionChange()
    this.fetchTemplateRule();
  },

  actions: {
    showAdvanced() {
      set(this, 'showAdvancedSection', true)
    },
  },
  targetTypeChanged: observer('model._targetType', function() {
    const t = get(this, 'model._targetType');

    this.setEventType(t);
  }),

  clustScanRuleFailuresOnlyChanged: observer('clustScanRuleFailuresOnly', function() {
    set(this, 'model.clusterScanRule.failuresOnly', get(this, 'clustScanRuleFailuresOnly') === 'true');
  }),

  expressionChange: observer('model.metricRule.{expression,commonRule,templateRule}', 'model._targetType', function() {
    if (!get(this, 'monitoringEnabled')) {
      return
    }

    let expression = null;
    const globalStore = get(this, 'globalStore')
    const clusterId = get(this, 'scope.currentCluster.id')

    set(this, 'graphStatus', null)

    if (get(this, 'model._targetType') === 'metric') {
      expression = get(this, 'model.metricRule.expression')
    }

    if (get(this, 'model._targetType') === 'commonRules') {
      expression = get(this, 'model.metricRule.commonRule')
    }

    if (get(this, 'model._targetType') === 'templateRules') {
      expression = get(this, 'model.metricRule.templateRule')
    }

    if (expression) {
      set(this, 'graphLoading', true)
      globalStore.rawRequest({
        url:    `monitormetrics?action=querycluster`,
        method: 'POST',
        data:   {
          expr:     expression,
          from:     'now-24h',
          interval: '300s',
          to:       'now',
          clusterId,
        }
      }).then((res) => {
        if (res.body) {
          const body = JSON.parse(res.body)
          const { series = [] } = body

          setProperties(this, {
            chartOption: { series },
            graphStatus: 'success',
          })
        } else {
          set(this, 'graphStatus', 'noData')
        }
      }).catch(() => {
        set(this, 'graphStatus', 'error')
      }).finally(() => {
        set(this, 'graphLoading', false)
      })
    }
  }),

  commonRuleChange: observer('model.metricRule.commonRule', 'model._targetType', function() {
    if (get(this, 'model._targetType') !== 'commonRules') {
      return;
    }
    const selected = get(this, 'commonRulesContent').findBy('value', get(this, 'model.metricRule.commonRule'));
    const selectedThresholdValue = get(selected || {}, 'thresholdValue');
    const onlyReadThresholdValue = get(selected || {}, 'onlyReadThresholdValue');
    const selectedComparison = get(selected || {}, 'comparison');
    const selectedUnit = get(selected || {}, 'unit');

    if (selectedThresholdValue !== undefined) {
      set(this, 'model.metricRule.thresholdValue', selectedThresholdValue)
    }

    if (onlyReadThresholdValue) {
      set(this, 'model.metricRule.onlyReadThresholdValue', onlyReadThresholdValue)
    } else {
      set(this, 'model.metricRule.onlyReadThresholdValue', false)
    }

    if (selectedComparison) {
      set(this, 'model.metricRule.comparison', selectedComparison)
    }

    if (selectedUnit) {
      set(this, 'model.metricRule.unit', selectedUnit)
    } else {
      set(this, 'model.metricRule.unit', '')
    }
  }),

  templateRuleChange: observer('model.metricRule.templateRule', 'model._targetType', function() {
    if (get(this, 'model._targetType') !== 'templateRules') {
      return;
    }
    const selected = get(this, 'templateRulesContent').findBy('value', get(this, 'model.metricRule.templateRule'));
    const selectedThresholdValue = get(selected || {}, 'thresholdValue');
    const selectedDuration = get(selected || {}, 'duration');
    const onlyReadThresholdValue = get(selected || {}, 'onlyReadThresholdValue');
    const selectedComparison = get(selected || {}, 'comparison');
    const selectedUnit = get(selected || {}, 'unit');

    if (selectedThresholdValue !== undefined) {
      set(this, 'model.metricRule.thresholdValue', selectedThresholdValue)
    }

    if (selectedDuration !== undefined) {
      if (C.ALERT_DURATION.map((item) => item.value).indexOf(selectedDuration) > -1) {
        set(this, 'model.metricRule.duration', selectedDuration)
      } else {
        set(this, 'model.metricRule.duration', '5m')
      }
    }

    if (onlyReadThresholdValue) {
      set(this, 'model.metricRule.onlyReadThresholdValue', onlyReadThresholdValue)
    } else {
      set(this, 'model.metricRule.onlyReadThresholdValue', false)
    }

    if (selectedComparison) {
      set(this, 'model.metricRule.comparison', selectedComparison)
    }

    if (selectedUnit) {
      set(this, 'model.metricRule.unit', selectedUnit)
    } else {
      set(this, 'model.metricRule.unit', '')
    }
  }),

  models: computed('model', function() {
    return [get(this, 'model')]
  }),

  metricsContent: computed('metrics.[]', function() {
    const metrics = get(this, 'metrics') || []

    return metrics.map((m) => ({
      label: m,
      value: m
    }))
  }),

  commonRulesContent: computed('commonRules.[]', 'intl.locale', function() {
    const commonRules = get(this, 'commonRules') || [];

    return commonRules.map((r) => {
      return {
        ...r,
        group: r.label,
        label: r.value,
      }
    });
  }),

  templateRulesContent: computed('intl.locale', 'templateRules.[]', function() {
    const rules = get(this, 'templateRules') || {};
    let val = [];

    for (let key in rules){
      const parsedYaml = jsyaml.safeLoad(rules[key]) || {};
      const metricRule = get(parsedYaml, 'metricRule') || {};

      if (get(parsedYaml, 'metricRule.expression')){
        val.push({
          ...metricRule,
          displayName: get(parsedYaml, 'displayName') || key,
          group:       get(parsedYaml, 'displayName') || key,
          label:       get(parsedYaml, 'metricRule.expression'),
          scope:       'cluster',
          value:       get(parsedYaml, 'metricRule.expression'),
        });
      }
    }

    return val;
  }),

  nodes: computed('clusterId', function() {
    const clusterId = get(this, 'clusterId');

    return get(this, 'globalStore').all('node').filterBy('clusterId', clusterId);
  }),

  isEventTarget: computed('model._targetType', function() {
    const t = get(this, 'model._targetType');

    return t === 'warningEvent' || t ===  'normalEvent';
  }),

  verbStyles: computed('model._targetType', function() {
    const tt = get(this, 'model._targetType');
    let out = '';

    if (tt === 'node' || tt === 'nodeSelector') {
      out = `padding-top: 6px;`;
    }

    return htmlSafe(out);
  }),

  canRemoveRule: computed('alertRules.[]', 'isCreate', 'editRule', function() {
    const alertRules = get(this, 'alertRules') || []
    const isCreate = get(this, 'isCreate')
    const editRule = get(this, 'editRule')

    if (alertRules.length > 1 && isCreate && !editRule) {
      return true
    }

    return false
  }),

  expressionStyle: computed('monitoringEnabled', function() {
    const out = get(this, 'monitoringEnabled') ? '' : 'color: #bfbfbf;'

    return htmlSafe(out);
  }),

  setEventType(t) {
    if (t === 'warningEvent') {
      set(this, 'model.eventRule.eventType', 'Warning');
    }
    if (t === 'normalEvent') {
      set(this, 'model.eventRule.eventType', 'Normal');
    }
  },

  fetchTemplateRule(){
    get(this, 'globalStore').rawRequest({
      url:     `/v3/metricruletemplates/cattle-global-data:pandaria-cluster-metrics-rules`,
      method:  'GET',
    }).then((res) => {
      set(this, 'templateRules', res?.body?.data || {});
    })
  },

});
