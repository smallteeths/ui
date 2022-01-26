import Component from '@ember/component';
import { computed, get, set, observer } from '@ember/object';
import initGraph from 'ui/utils/resource-quota-percent-gauge';
import layout from './template'
import { inject as service } from '@ember/service';
import { convertToLimit, quotaWithUnits } from 'shared/utils/quota-unit';
import calculatePosition from 'shared/utils/calculate-position';

export const headers = [
  {
    name:           'name',
    translationKey: 'quotasCn.headers.namespace',
    width:          100,
  },
  {
    name:           'state',
    classNames:     'text-center',
    translationKey: 'quotasCn.headers.used',
    width:          80,
  }
];

// Long titles must be reduced in font size
const longSizeTitle = ['Replication Controllers', 'StorageClass Storage', 'StorageClassPVC']

export default Component.extend({
  intl:            service(),
  tooltipService:  service('tooltip'),
  modalService:    service('modal'),
  resourceActions: service('resource-actions'),

  layout,
  headers,

  project:          null,
  quotaKey:         null,
  namespaceQuotas:  [],
  classNames:       ['quota-inner-cn'],
  hasPermissions:   false,

  init() {
    this._super(...arguments);
  },

  didInsertElement() {
    this.drawQuotaGraph();
  },

  actions:       {
    expandAll() {
      this.toggleProperty('expandAll');
    },
    clickedAction(dd) {
      set(this, 'project.canEditQoutaKey', get(this, 'quotaKey'));
      set(this, 'project.canEditQuotaSubKey', get(this, 'quotaSubKey'));
      get(this, 'modalService').toggleModal('modal-edit-project-quotas-cn', {
        model:  get(this, 'project'),
        cb:    () => {
          this.sendAction('refreshModel');
        }
      });

      dd.actions.close();
    },

    actionsOpen() {
      set(get(this, 'tooltipService'), 'childOpened', true);
    },

    actionsClosed() {
      set(get(this, 'tooltipService'), 'childOpened', false);
      get(this, 'tooltipService').hide();
    },

    calculatePosition,
  },
  reDrawQuotGraph: observer('intl.locale', function() {
    this.drawQuotaGraph();
  }),
  used: computed('model.quotaSetting.limit', 'quotaKey', 'quotaTotal', 'usedProp', function() {
    let used = parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'usedProp')), 10)

    return get(this, 'usedProp') ? quotaWithUnits(get(this, 'quotaKey'), used, true) : 0;
  }),
  quotaTotalText: computed('quotaKey', 'quotaTotal', 'usedProp', function() {
    let total = parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'quotaTotal')), 10);

    return get(this, 'quotaTotal') ? quotaWithUnits(get(this, 'quotaKey'), total, true) : 0;
  }),
  firstLetterQuotaName: computed('quotaName', 'usedProp', 'quotaTotal', function() {
    return get(this, 'quotaName') && get(this, 'quotaName').slice(0, 1).toUpperCase();
  }),

  namespaceQuotasFormat: computed('namespaceQuotas.[]', function() {
    let namespaceQuotas = get(this, 'namespaceQuotas');
    let namespaceAssignedArray = []

    if (namespaceQuotas && namespaceQuotas.length > 0) {
      namespaceAssignedArray = namespaceQuotas.map((item) => {
        let obj = {};

        Object.assign(obj, item)
        obj.used = quotaWithUnits(item.label, parseInt(convertToLimit(item.label, item.used), 10), true);
        obj.usedInNS = quotaWithUnits(item.label, parseInt(item.usedInNS, 10), true);

        if (item.label === 'requestsCpu' || item.label === 'limitsCpu') {
          obj.used = obj.used.replace('milli CPUs', 'milli');
          obj.usedInNS = obj.usedInNS.replace('milli CPUs', 'milli');
        }

        return obj;
      })
    }
    // Sort by namespace
    namespaceAssignedArray.sort((a, b) => {
      if (a.name && b.name) {
        return a.name.toString().localeCompare(b.name)
      }

      return 0
    })

    return namespaceAssignedArray
  }),

  quotaData: computed('intl.locale', 'namespaceQuotas.[]', 'quotaKey', 'quotaTotal', 'usedProp', function() {
    let namespaceQuotas = get(this, 'namespaceQuotas');
    let label = get(this, 'quotaKey');
    let distribution = 0;
    let used = parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'usedProp')), 10)
    let total = parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'quotaTotal')), 10)

    if (namespaceQuotas && namespaceQuotas.length > 0) {
      namespaceQuotas.forEach((item) => {
        distribution += parseInt(convertToLimit(get(this, 'quotaKey'), item.used), 10);
      })
    }
    let canAssigned = total - distribution;

    return {
      total,
      used,
      distribution,
      canAssigned,
      label
    }
  }),
  percent: computed('quotaKey', 'quotaName', 'quotaTotal', 'usedProp', function() {
    if (get(this, 'usedProp') && get(this, 'quotaTotal')) {
      let used = parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'usedProp')), 10);
      let total = parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'quotaTotal')), 10);

      if (total === 0) {
        total = 1
      }

      return ( (used / total) * 100 || 0 ).toFixed(2)
    } else {
      return '0.00'
    }
  }),
  maxQuotas: computed('quotaKey', 'quotaName', 'quotaTotal', 'usedProp', function() {
    if (get(this, 'usedProp') && get(this, 'quotaTotal')) {
      return parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'quotaTotal')), 10)
    } else {
      return 0
    }
  }),

  generateTooltipHtml(label, used, distribution, remain, total) {
    let intl = get(this, 'intl');
    let legends = [
      {
        label: intl.t('quotasCn.chart.used'),
        color: '#F1C40F',
        value: quotaWithUnits(label, used, true),
      },
      {
        label: intl.t('quotasCn.chart.distribution'),
        color: '#52c41a',
        value: quotaWithUnits(label, distribution, true),
      },
      {
        label: intl.t('quotasCn.chart.remain'),
        color: '#ecf0f1',
        value: quotaWithUnits(label, remain, true),
      },
      {
        label: '',
        color: '#fff',
        value: '',
      },
      {
        label: intl.t('quotasCn.chart.total'),
        color: '',
        value: quotaWithUnits(label, total, true),
      },
    ]
    // generate tooltip html
    let tooltipString = legends.map((item) => item.label ? `<div style="display: flex; align-items: center">
      <span style="display: inline-block; width: 8px; height: 5px; background: ${ item.color }"></span>
      <div style="flex: 1; display: flex; justify-content: space-between; padding: 0px 5px">
        <div>${ item.label }</div>
        <div>${ item.value }</div>
      </div>
    </div>` : `<div style="margin: 5px; height: 2px; background: ${ item.color }"></div>`).join('')

    let element = `
      <div style="width: 300px">
      ${ tooltipString }
      </div>
    `

    return element
  },

  drawQuotaGraph() {
    let intl = get(this, 'intl');
    // Usage as a percentage of total
    let usedPercentToTotal = ((get(this, 'quotaData').used / get(this, 'quotaData').total) * 100).toFixed(2)
    let distributionPercent = ((get(this, 'quotaData').distribution / get(this, 'quotaData').total) * 100).toFixed(2)
    let label = get(this, 'quotaData').label
    let tooltipHtml = this.generateTooltipHtml(label, get(this, 'quotaData').used, get(this, 'quotaData').distribution, get(this, 'quotaData').canAssigned, get(this, 'quotaData').total)
    let smallTitleSize = false

    if (longSizeTitle.some((item) => {
      return item === get(this, 'quotaName')
    })) {
      smallTitleSize = true
    }

    set(this, 'svg', initGraph({
      el:                  this.element.getElementsByClassName('quota-chart')[0],
      title:               `${ get(this, 'quotaName') } ${ get(this, 'quotaState') }`,
      usedPercent:         usedPercentToTotal,
      distributionPercent,
      totalText:           quotaWithUnits(label, get(this, 'quotaData').total, true),
      quotaSubKeyText: get(this, 'quotaSubKey') ? `${ intl.t('quotasCn.chart.class') }: ${ get(this, 'quotaSubKey') }` : '',
      canAssignedText:     `${ intl.t('quotasCn.chart.remain') } ${ quotaWithUnits(label, get(this, 'quotaData').canAssigned, true) }`,
      tooltipHtml,
      smallTitleSize,
      isProject:           true,
    }));
  }
});
