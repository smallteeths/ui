import {
  get, set, computed, observer, setProperties
} from '@ember/object';
import { inject as service } from '@ember/service';
import { reads } from '@ember/object/computed';
import Component from '@ember/component';
import { htmlSafe } from '@ember/string';
import C from 'ui/utils/constants';
import { debouncedObserver } from 'ui/utils/debounce';

export default Component.extend({
  globalStore:            service(),
  scope:                  service(),
  intl:                   service(),

  restartIntervalSeconds: null,
  graphStatus:            null,
  projectId:              reads('scope.currentProject.id'),

  init(...args) {
    this._super(...args);

    const n = get(this, 'model.podRule.restartIntervalSeconds') / 60 || 5;

    set(this, 'restartIntervalSeconds', n);

    if (get(this, 'model.podRule')) {
      set(this, 'model.podRule.restartIntervalSeconds', n * 60);
    }

    this.expressionChange()
  },

  actions: {
    showAdvanced() {
      set(this, 'showAdvancedSection', true)
    },
    transformRulelabel(labels) {
      set(this, 'model.metricRule.podRebootRuleLabels', labels)
    }
  },

  expressionChange: observer('model.metricRule.{expression,commonRule,podRebootRule}', function() {
    if (!get(this, 'monitoringEnabled')) {
      return
    }

    let expression = null
    const globalStore = get(this, 'globalStore')
    const projectId = get(this, 'scope.currentProject.id')

    if (get(this, 'model._targetType') === 'metric') {
      expression = get(this, 'model.metricRule.expression');
    }

    if (get(this, 'model._targetType') === 'commonRules') {
      expression = get(this, 'model.metricRule.commonRule')
    }

    if (get(this, 'model._targetType') === 'podRebootRule') {
      expression = get(this, 'model.metricRule.podRebootRule')
    }

    if (expression) {
      set(this, 'graphLoading', true)
      globalStore.rawRequest({
        url:    `monitormetrics?action=queryproject`,
        method: 'POST',
        data:   {
          expr:     expression,
          from:     'now-24h',
          interval: '300s',
          to:       'now',
          projectId,
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

  commonRuleChange: observer('model.metricRule.commonRule', function() {
    const selected = get(this, 'commonRulesContent').findBy('value', get(this, 'model.metricRule.commonRule'));
    const selectedThresholdValue = get(selected || {}, 'thresholdValue');
    const selectedComparison = get(selected || {}, 'comparison');
    const selectedUnit = get(selected || {}, 'unit');

    if (selectedThresholdValue) {
      set(this, 'model.metricRule.thresholdValue', selectedThresholdValue)
    }

    if (selectedComparison) {
      set(this, 'model.metricRule.comparison', selectedComparison)
    }

    if (selectedUnit) {
      set(this, 'model.metricRule.unit', selectedUnit)
    }
  }),

  restartIntervalSecondsChanged: observer('restartIntervalSeconds', function() {
    const n = +get(this, 'restartIntervalSeconds') || 5;

    set(this, 'model.podRule.restartIntervalSeconds', n * 60);
  }),

  targetTypeChange: observer('model._targetType', function() {
    set(this, 'graphStatus', null)

    if (get(this, 'model._targetType') === 'podRebootRule') {
      set(this, 'model.metricRule.thresholdValue', C.POD_REBOOT_RULE.thresholdValue)
      set(this, 'model.metricRule.comparison', C.POD_REBOOT_RULE.comparison)
      set(this, 'model.metricRule.unit', C.POD_REBOOT_RULE.unit)
    }

    if (get(this, 'model._targetType') === 'commonRules') {
      this.commonRuleChange()
    }

    this.expressionChange()
  }),

  podRebootRuleChange: debouncedObserver('model.metricRule.podRebootRuleLabels', function() {
    const labels = get(this, 'model.metricRule.podRebootRuleLabels');
    const labelArray = [];
    const reg = new RegExp(/[-\.!@#\$%\\\^&\*\)\(\+=\{\}\[\]\/",'<>~\·`\?:;|]+/, 'g');

    for (let key in labels) {
      const realKey = key.replace(reg, '_');

      labelArray.push(`label_${ realKey }="${ labels[key] }"`);
    }
    set(this, 'model.metricRule.podRebootRule', this.transFormPodRebootRule(labelArray.join(',')))
  }),

  pods: computed('projectId', function() {
    const projectId = get(this, 'projectId');

    return get(this, 'store').all('pod').filterBy('projectId', projectId);
  }),

  workloads: computed('projectId', function() {
    const projectId = get(this, 'projectId');

    return get(this, 'store').all('workload').filterBy('projectId', projectId);
  }),

  metricsContent: computed('metrics.[]', function() {
    const metrics = get(this, 'metrics') || []

    return metrics.map((m) => ({
      label: m,
      value: m
    }))
  }),

  commonRulesContent: computed('commonRules.[]', function() {
    return get(this, 'commonRules') || []
  }),

  expressionStyle: computed('monitoringEnabled', function() {
    const out = get(this, 'monitoringEnabled') ? '' : 'color: #bfbfbf;'

    return htmlSafe(out);
  }),

  transFormPodRebootRule(labels) {
    const base = get(C.POD_REBOOT_RULE, 'value');

    return base.replace(/label_\$labelKey="\$labelValue"/gi, labels || '')
  }
});
