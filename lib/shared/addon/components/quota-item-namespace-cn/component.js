import Component from '@ember/component';
import { computed, get, set } from '@ember/object';
import layout from './template'
import { inject as service } from '@ember/service';
import { convertToLimit, quotaWithUnits } from 'shared/utils/quota-unit';
import calculatePosition from 'shared/utils/calculate-position';

export default Component.extend({
  resourceActions: service('resource-actions'),
  tooltipService:  service('tooltip'),
  modalService:    service('modal'),

  layout,

  allNamespace:  [],
  namespace:     null,
  quotaKey:      null,

  actions:       {
    expandAll() {
      this.toggleProperty('expandAll');
    },
    clickedAction() {
      set(this, 'namespace.canEditQoutaKey', get(this, 'quotaKey'))
      window.scrollTo(0, 0);
      this.get('modalService').toggleModal('modal-edit-namespace-quotas-cn', {
        model: get(this, 'namespace'),
        cb:    () => {
          this.sendAction('refreshModel');
        }
      })
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
  used: computed('usedProp', 'quotaTotal', function() {
    let used = parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'usedProp')), 10)

    return get(this, 'usedProp') ? quotaWithUnits(get(this, 'quotaKey'), used, true) : 0;
  }),
  available: computed('usedProp', 'quotaTotal', function() {
    if (get(this, 'usedProp') && get(this, 'quotaTotal')) {
      let used = parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'usedProp')), 10);
      let total = parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'quotaTotal')), 10);
      let available = Math.floor( total - used )

      return quotaWithUnits(get(this, 'quotaKey'), available, true);
    } else {
      let total = get(this, 'quotaTotal') ? parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'quotaTotal')), 10) : 0;

      return quotaWithUnits(get(this, 'quotaKey'), total, true);
    }
  }),
  quotaTotalText: computed('quotaTotal', 'usedProp', function() {
    let total = parseInt(convertToLimit(get(this, 'quotaKey'), get(this, 'quotaTotal')), 10);

    return get(this, 'quotaTotal') ? quotaWithUnits(get(this, 'quotaKey'), total, true) : 0;
  }),
  firstLetterQuotaName: computed('quotaName', 'quotaTotal', 'usedProp', function() {
    return get(this, 'quotaName') && get(this, 'quotaName').slice(0, 1).toUpperCase();
  }),
  percent: computed('quotaName', 'quotaTotal', 'usedProp', function() {
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
});
