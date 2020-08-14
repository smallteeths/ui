import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { get, set, observer, computed } from '@ember/object'

const UNINCLUDTARGETTYPE = ['systemService', 'nodeSelector'];

export default Component.extend({
  intl:   service(),

  model:  null,
  nodes:  [],

  disabledExtraAlertData: false,

  node: null,

  customStepOneOption:              [],
  customStepTwoOption:              [],
  customStepThreeOptionLabels:      [],
  customStepThreeOptionAnnotations: [],
  nodeExtraAlertDatas:              [],
  metricExtraAlertDatas:            [],
  commonRulesExtraAlertDatas:       [],

  init() {
    this._super(...arguments);
    this.targetTypeChanged();
    this.intlChange();

    set(this, 'nodeExtraAlertDatas', []);
    set(this, 'metricExtraAlertDatas', []);
    set(this, 'commonRulesExtraAlertDatas', []);
    if (get(this, 'model.extraAlertDatas') && get(this, 'model.extraAlertDatas').length > 0) {
      switch (get(this, 'model._targetType')) {
      case 'node':
        set(this, 'nodeExtraAlertDatas', get(this, 'model.extraAlertDatas'));
        break;
      case 'metric':
        set(this, 'metricExtraAlertDatas', get(this, 'model.extraAlertDatas'));
        break;
      case 'commonRules':
        set(this, 'commonRulesExtraAlertDatas', get(this, 'model.extraAlertDatas'));
        break;
      case 'normalEvent':
        set(this, 'commonRulesExtraAlertDatas', get(this, 'model.extraAlertDatas'));
        break;
      case 'warningEvent':
        set(this, 'commonRulesExtraAlertDatas', get(this, 'model.extraAlertDatas'));
        break;
      }
    }
  },

  actions: {
    addLabel() {
      let extraAlertDatas = []

      switch (get(this, 'model._targetType')) {
      case 'node':
        extraAlertDatas = get(this, 'nodeExtraAlertDatas')
        break;
      case 'metric':
        extraAlertDatas = get(this, 'metricExtraAlertDatas')
        break;
      case 'commonRules':
        extraAlertDatas = get(this, 'commonRulesExtraAlertDatas')
        break;
      case 'normalEvent':
        extraAlertDatas = get(this, 'commonRulesExtraAlertDatas')
        break;
      case 'warningEvent':
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

  targetTypeChanged: observer('model._targetType', 'model.nodeRule.nodeId', function() {
    if (UNINCLUDTARGETTYPE.indexOf(get(this, 'model._targetType')) > -1) {
      set(this, 'disabledExtraAlertData', true)
    } else {
      if (get(this, 'model._targetType') === 'node' && !get(this, 'model.nodeRule.nodeId')) {
        set(this, 'disabledExtraAlertData', true)
      } else {
        set(this, 'disabledExtraAlertData', false)
      }
    }

    if (get(this, 'model._targetType') === 'node' && get(this, 'model.nodeRule.nodeId')) {
      set(this, 'node', get(this, 'nodes').find((item) => {
        return get(this, 'model.nodeRule.nodeId') === item.id
      }))

      if (get(this, 'node')) {
        get(this, 'nodeExtraAlertDatas').forEach((item) => {
          if (get(item, 'sourceType') !== 'static') {
            set(item, 'sourceValue', '')
          }
        })
        let annotations = get(this, 'node.annotations') ? Object.keys(get(this, 'node.annotations')).map((key) => {
          return {
            value: key,
            label: key,
          }
        }) : [];

        let labels = get(this, 'node.labels') ? Object.keys(get(this, 'node.labels')).map((key) => {
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
    return get(this, 'model._targetType') === 'metric' || get(this, 'model._targetType') === 'commonRules' || get(this, 'model._targetType') === 'normalEvent' || get(this, 'model._targetType') === 'warningEvent' ;
  }),

  extraAlertDatas: computed('model._targetType', 'commonRulesExtraAlertDatas.@each.{targetKey,sourceType,sourceValue,targetType}', 'nodeExtraAlertDatas.@each.{targetKey,sourceType,sourceValue,targetType}', 'metricExtraAlertDatas.@each.{targetKey,sourceType,sourceValue,targetType}', function() {
    switch (get(this, 'model._targetType')) {
    case 'node':
      return get(this, 'nodeExtraAlertDatas')
    case 'metric':
      return get(this, 'metricExtraAlertDatas')
    case 'commonRules':
      return get(this, 'commonRulesExtraAlertDatas')
    case 'normalEvent':
      return get(this, 'commonRulesExtraAlertDatas')
    case 'warningEvent':
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
