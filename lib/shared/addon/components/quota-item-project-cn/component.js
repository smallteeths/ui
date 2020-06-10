import Component from '@ember/component';
import { computed, get, set } from '@ember/object';
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
    translationKey: 'quotasCn.headers.used',
    width:          80,
  },
  {
    classNames:     'text-right',
    name:           'created',
    translationKey: 'quotasCn.headers.percentInNS',
    width:          120,
  },
];

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
  actions:       {
    expandAll() {
      this.toggleProperty('expandAll');
    },
    clickedAction() {
      set(this, 'project.canEditQoutaKey', get(this, 'quotaKey'));
      get(this, 'modalService').toggleModal('modal-edit-project-quotas-cn', {
        model:  get(this, 'project'),
        cb:    () => {
          this.sendAction('refreshModel');
        }
      });
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
  used: computed('usedProp', 'quotaTotal', 'model.quotaSetting.limit', function() {
    let used = parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'usedProp')), 10)

    return get(this, 'usedProp') ? quotaWithUnits(get(this, 'quotaKey'), used, true) : 0;
  }),
  quotaTotalText: computed('quotaTotal', 'usedProp', function() {
    let total = parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'quotaTotal')), 10);

    return get(this, 'quotaTotal') ? quotaWithUnits(get(this, 'quotaKey'), total, true) : 0;
  }),
  firstLetterQuotaName: computed('quotaName', 'usedProp', 'quotaTotal', function() {
    return get(this, 'quotaName') && get(this, 'quotaName').slice(0, 1).toUpperCase();
  }),

  namespaceQuotasFormat: computed('namespaceQuotas.[]', function() {
    let namespaceQuotas = get(this, 'namespaceQuotas');

    if (namespaceQuotas && namespaceQuotas.length > 0) {
      return namespaceQuotas.map((item) => {
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
    } else {
      return [];
    }
  }),

  quotaPercentData: computed('namespaceQuotas.[]', 'intl.locale', 'usedProp', 'quotaTotal', function() {
    let intl = get(this, 'intl');
    let namespaceQuotas = get(this, 'namespaceQuotas');
    let label = '';
    let total = 0;
    let canAssigned = 0;
    let used = parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'usedProp')), 10)

    if (namespaceQuotas && namespaceQuotas.length > 0) {
      namespaceQuotas.forEach((item) => {
        total += parseInt(convertToLimit(get(this, 'quotaKey'), item.used), 10);
        label = item.label;
      })
    }

    canAssigned = parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'quotaTotal')), 10) - total;

    const tooltipValues   = [
      {
        label: intl.t('quotasCn.common.use'),
        value: quotaWithUnits(label, used, true),
      },
      {
        label: intl.t('quotasCn.headers.used'),
        value: quotaWithUnits(label, total, true),
      },
      {
        label: intl.t('quotasCn.remain'),
        value: quotaWithUnits(label, canAssigned, true),
      },
      {
        label: intl.t('quotasCn.common.total'),
        value: quotaWithUnits(label, parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'quotaTotal')), 10), true),
      }
    ];

    total = total - used;

    const value =  [
      {
        color: 'bg-primary',
        label,
        value: used,
      },
      {
        color: 'bg-info',
        label,
        value: total
      },
    ];

    return  {
      tooltipValues,
      value,
      canAssigned: quotaWithUnits(label, canAssigned, true),
    }
  }),
  percent: computed('quotaName', 'usedProp', 'quotaTotal', function() {
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
  maxQuotas: computed('quotaName', 'usedProp', 'quotaTotal', function() {
    if (get(this, 'usedProp') && get(this, 'quotaTotal')) {
      return parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'quotaTotal')), 10)
    } else {
      return 0
    }
  }),
});
