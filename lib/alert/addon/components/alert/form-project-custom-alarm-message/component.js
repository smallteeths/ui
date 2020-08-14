import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { get, set, observer, computed } from '@ember/object'

const UNINCLUDTARGETTYPE = ['workloadSelector', 'podRebootRule'];

export default Component.extend({
  intl:   service(),

  model:     null,
  pods:      [],
  workloads: [],

  disabledExtraAlertData: false,

  pod:      null,
  workload: null,

  customStepOneOption:              [],
  customStepTwoOption:              [],
  customStepThreeOptionLabels:      [],
  customStepThreeOptionAnnotations: [],
  podExtraAlertDatas:               [],
  workloadExtraAlertDatas:          [],
  metricExtraAlertDatas:            [],
  commonRulesExtraAlertDatas:       [],

  init() {
    this._super(...arguments);
    this.targetTypeChanged()
    this.intlChange();

    set(this, 'podExtraAlertDatas', []);
    set(this, 'workloadExtraAlertDatas', []);
    set(this, 'metricExtraAlertDatas', []);
    set(this, 'commonRulesExtraAlertDatas', []);

    if (get(this, 'model.extraAlertDatas') && get(this, 'model.extraAlertDatas').length > 0) {
      switch (get(this, 'model._targetType')) {
      case 'pod':
        set(this, 'podExtraAlertDatas', get(this, 'model.extraAlertDatas'));
        break;
      case 'workload':
        set(this, 'workloadExtraAlertDatas', get(this, 'model.extraAlertDatas'));
        break;
      case 'metric':
        set(this, 'metricExtraAlertDatas', get(this, 'model.extraAlertDatas'));
        break;
      case 'commonRules':
        set(this, 'commonRulesExtraAlertDatas', get(this, 'model.extraAlertDatas'));
        break;
      }
    }
  },

  actions: {
    addLabel() {
      let extraAlertDatas = [];

      switch (get(this, 'model._targetType')) {
      case 'pod':
        extraAlertDatas = get(this, 'podExtraAlertDatas')
        break;
      case 'workload':
        extraAlertDatas = get(this, 'workloadExtraAlertDatas')
        break;
      case 'metric':
        extraAlertDatas = get(this, 'metricExtraAlertDatas')
        break;
      case 'commonRules':
        extraAlertDatas = get(this, 'commonRulesExtraAlertDatas')
        break;
      }

      extraAlertDatas.pushObject(
        {
          targetKey:   '',
          sourceType:  get(this, 'isExpressionOrRules') ? 'static' : 'labels',
          sourceValue: '',
          targetType:  'labels'
        }
      )
    },
    removeLabel(obj) {
      get(this, 'model.extraAlertDatas').removeObject(obj);
    },

    sourceTypeChanged(extraAlertData) {
      set(extraAlertData, 'sourceValue', '');
    },

    targetTypeChanged(extraAlertData) {
      if (get(extraAlertData, 'targetType') === 'labels' && get(this, 'isExpressionOrRules')) {
        set(extraAlertData, 'sourceType', 'static');
      }
    }
  },

  intlChange: observer('intl.locale', function() {
    set(this, 'customStepOneOption', [
      {
        label: get(this, 'intl').t('alertPage.customLabel.customStepOneOption.label'),
        value: 'labels'
      },
      {
        label:  get(this, 'intl').t('alertPage.customLabel.customStepOneOption.message'),
        value: 'annotations'
      },
    ])

    set(this, 'customStepTwoOption', [
      {
        label: get(this, 'intl').t('alertPage.customLabel.customStepTwoOption.label'),
        value: 'labels'
      },
      {
        label: get(this, 'intl').t('alertPage.customLabel.customStepTwoOption.annotations'),
        value: 'annotations'
      },
      {
        label: get(this, 'intl').t('alertPage.customLabel.customStepTwoOption.custom'),
        value: 'static',
      },
    ])
  }),

  targetTypeChanged: observer('model._targetType', 'model.podRule.podId', 'model.workloadRule.workloadId', function() {
    if (UNINCLUDTARGETTYPE.indexOf(get(this, 'model._targetType')) > -1) {
      set(this, 'disabledExtraAlertData', true)
    } else {
      if (get(this, 'model._targetType') === 'pod' && !get(this, 'model.podRule.podId')) {
        set(this, 'disabledExtraAlertData', true)
      } else if (get(this, 'model._targetType') === 'workload' && !get(this, 'model.workloadRule.workloadId')) {
        set(this, 'disabledExtraAlertData', true)
      } else {
        get
        set(this, 'disabledExtraAlertData', false)
      }
    }

    if (get(this, 'model._targetType') === 'pod' && get(this, 'model.podRule.podId')) {
      set(this, 'pod', get(this, 'pods').find((item) => {
        return get(this, 'model.podRule.podId') === item.id
      }))

      if (get(this, 'pod')) {
        get(this, 'podExtraAlertDatas').forEach((item) => {
          if (get(item, 'sourceType') !== 'static') {
            set(item, 'sourceValue', '')
          }
        })
        let annotations = get(this, 'pod.annotations') ? Object.keys(get(this, 'pod.annotations')).map((key) => {
          return {
            value: key,
            label: key,
          }
        }) : [];

        let labels = get(this, 'pod.labels') ? Object.keys(get(this, 'pod.labels')).map((key) => {
          return {
            value: key,
            label: key,
          }
        }) : [];

        set(this, 'customStepThreeOptionLabels', labels)
        set(this, 'customStepThreeOptionAnnotations', annotations)
      }
    }

    if (get(this, 'model._targetType') === 'workload' && get(this, 'model.workloadRule.workloadId')) {
      set(this, 'workload', get(this, 'workloads').find((item) => {
        return get(this, 'model.workloadRule.workloadId') === item.id
      }))

      if (get(this, 'workload')) {
        get(this, 'workloadExtraAlertDatas').forEach((item) => {
          if (get(item, 'sourceType') !== 'static') {
            set(item, 'sourceValue', '')
          }
        })
        let annotations = get(this, 'workload.annotations') ? Object.keys(get(this, 'workload.annotations')).map((key) => {
          return {
            value: key,
            label: key,
          }
        }) : [];

        let labels = get(this, 'workload.labels') ? Object.keys(get(this, 'workload.labels')).map((key) => {
          return {
            value: key,
            label: key,
          }
        }) : [];

        set(this, 'customStepThreeOptionLabels', labels)
        set(this, 'customStepThreeOptionAnnotations', annotations)
      }
    }
  }),

  extraAlertDatasChange: observer('extraAlertDatas.@each.{targetKey,sourceType,sourceValue,targetType}', function() {
    this.setExtraAlertDatas();
  }),

  isExpressionOrRules: computed('model._targetType', function() {
    return get(this, 'model._targetType') === 'metric' || get(this, 'model._targetType') === 'commonRules';
  }),

  extraAlertDatas: computed('model._targetType', 'workloadExtraAlertDatas.@each.{targetKey,sourceType,sourceValue,targetType}', 'commonRulesExtraAlertDatas.@each.{targetKey,sourceType,sourceValue,targetType}', 'podExtraAlertDatas.@each.{targetKey,sourceType,sourceValue,targetType}', 'metricExtraAlertDatas.@each.{targetKey,sourceType,sourceValue,targetType}', function() {
    switch (get(this, 'model._targetType')) {
    case 'pod':
      return get(this, 'podExtraAlertDatas')
    case 'workload':
      return get(this, 'workloadExtraAlertDatas')
    case 'metric':
      return get(this, 'metricExtraAlertDatas')
    case 'commonRules':
      return get(this, 'commonRulesExtraAlertDatas')
    default:
      return [];
    }
  }),

  setExtraAlertDatas() {
    if (get(this, 'extraAlertDatas') && get(this, 'extraAlertDatas').length > 0) {
      set(this, 'model.extraAlertDatas', get(this, 'extraAlertDatas'));
    } else {
      set(this, 'model.extraAlertDatas', []);
    }
  }

});
