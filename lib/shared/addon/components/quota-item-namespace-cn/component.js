import Component from '@ember/component';
import { computed, get, set, observer } from '@ember/object';
import layout from './template'
import { inject as service } from '@ember/service';
import { convertToLimit, quotaWithUnits } from 'shared/utils/quota-unit';
import calculatePosition from 'shared/utils/calculate-position';
import initGraph from 'ui/utils/resource-quota-percent-gauge';

// Long titles must be reduced in font size
const longSizeTitle = ['Replication Controllers', 'StorageClass Storage', 'StorageClassPVC']

export default Component.extend({
  intl:            service('intl'),
  resourceActions: service('resource-actions'),
  tooltipService:  service('tooltip'),
  modalService:    service('modal'),

  layout,

  allNamespace:  [],
  namespace:     null,
  quotaKey:      null,

  didInsertElement() {
    this.drawQuotaGraph();
  },

  actions:       {
    expandAll() {
      this.toggleProperty('expandAll');
    },
    clickedAction(dd) {
      set(this, 'namespace.canEditQoutaKey', get(this, 'quotaKey'))
      set(this, 'namespace.canEditQuotaSubKey', get(this, 'quotaSubKey'));
      window.scrollTo(0, 0);
      this.get('modalService').toggleModal('modal-edit-namespace-quotas-cn', {
        model: get(this, 'namespace'),
        cb:    () => {
          this.sendAction('refreshModel');
        }
      })
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

  used: computed('quotaKey', 'quotaTotal', 'usedProp', function() {
    let used = parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'usedProp')), 10)

    return get(this, 'usedProp') ? quotaWithUnits(get(this, 'quotaKey'), used, true) : 0;
  }),
  available: computed('quotaKey', 'quotaTotal', 'usedProp', function() {
    if (get(this, 'usedProp') && get(this, 'quotaTotal')) {
      let used = parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'usedProp')), 10);
      let total = parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'quotaTotal')), 10);
      let available = Math.floor( total - used ) < 0 ? 0 : Math.floor( total - used );

      return quotaWithUnits(get(this, 'quotaKey'), available, true);
    } else {
      let total = get(this, 'quotaTotal') ? parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'quotaTotal')), 10) : 0;

      return quotaWithUnits(get(this, 'quotaKey'), total, true);
    }
  }),
  total: computed('quotaKey', 'quotaTotal', 'usedProp', function() {
    let total = parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'quotaTotal')), 10);

    return get(this, 'quotaTotal') ? quotaWithUnits(get(this, 'quotaKey'), total, true) : 0;
  }),
  firstLetterQuotaName: computed('quotaName', 'quotaTotal', 'usedProp', function() {
    return get(this, 'quotaName') && get(this, 'quotaName').slice(0, 1).toUpperCase();
  }),
  percent: computed('quotaKey', 'quotaName', 'quotaTotal', 'usedProp', function() {
    if (get(this, 'usedProp') && get(this, 'quotaTotal')) {
      let used = parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'usedProp')), 10);
      let total = parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'quotaTotal')), 10);

      if (total === 0) {
        total = 1
      }

      return ( (used / total) * 100 || 0 ).toFixed(2);
    } else {
      return '0.00'
    }
  }),

  generateTooltipHtml(used, remain, total) {
    let intl = get(this, 'intl');
    let legends = [
      {
        label: intl.t('quotasCn.chart.used'),
        color: '#F1C40F',
        value: used,
      },
      {
        label: intl.t('quotasCn.chart.remain'),
        color: '#ecf0f1',
        value: remain,
      },
      {
        label: '',
        color: '#fff',
        value: '',
      },
      {
        label: intl.t('quotasCn.chart.total'),
        color: '',
        value: total,
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
    let tooltipHtml = this.generateTooltipHtml(get(this, 'used'), get(this, 'available'), get(this, 'total'))
    let smallTitleSize = false

    if (longSizeTitle.some((item) => {
      return item === get(this, 'quotaName')
    })) {
      smallTitleSize = true
    }

    set(this, 'svg', initGraph({
      el:                  this.element.getElementsByClassName('quota-chart')[0],
      title:               `${ get(this, 'quotaName') } ${ get(this, 'quotaState') }`,
      usedPercent:         get(this, 'percent'),
      totalText:           get(this, 'total'),
      quotaSubKeyText: get(this, 'quotaSubKey') ? `${ intl.t('quotasCn.chart.class') }: ${ get(this, 'quotaSubKey') }` : '',
      canAssignedText:     `${ intl.t('quotasCn.chart.remain') } ${ get(this, 'available') }`,
      tooltipHtml,
      smallTitleSize,
    }));
  }

});
