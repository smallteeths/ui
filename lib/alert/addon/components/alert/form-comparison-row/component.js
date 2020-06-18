import { get, set } from '@ember/object';
import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { computed, observer } from '@ember/object';
import { htmlSafe } from '@ember/string';
import C from 'ui/utils/constants';
import { on } from '@ember/object/evented';

export default Component.extend({
  intl:                service(),

  comparisonObserver: on('init', observer('model.metricRule.comparison', function() {
    if (get(this, 'model.metricRule.comparison') === get(this, 'hasValue')) {
      set(this, 'model.metricRule.thresholdValue', null)
    }
  })),

  verbStyles: computed('model._targetType', function() {
    const targetType = get(this, 'model._targetType');
    const arr = ['pod', 'workload', 'workloadSelector', 'node', 'nodeSelector']

    let out = '';

    if (arr.includes(targetType)) {
      out = `padding-top: 6px;`;
    }

    return htmlSafe(out);
  }),

  operatorContent: computed(() => {
    return Object.values(C.ALERTING_COMPARISON).map((value) => {
      return {
        label: `alertPage.comparison.${ value }`,
        value,
      }
    })
  }),

  unit: computed('intl.locale', 'model.metricRule.unit', function() {
    const intl = get(this, 'intl');
    const unit = get(this, 'model.metricRule.unit');

    if (!unit) {
      return ''
    }

    return intl.t(`alertPage.newOrEdit.unit.${ unit }`)
  }),

  hasValue:            C.ALERTING_COMPARISON.HAS_VALUE,
  durationContent:     C.ALERT_DURATION,

});
