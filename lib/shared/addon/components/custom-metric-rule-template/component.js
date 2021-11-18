import Component from '@ember/component';
import layout from './template';
import { inject as service } from '@ember/service';
import { get, set, computed } from '@ember/object';

const headers = [
  {
    name:           'name',
    sort:           ['name', 'id'],
    searchField:    'name',
    translationKey: 'metricruletemplate.table.name',
    width:          250,
  },
  {
    name:           'level',
    translationKey: 'metricruletemplate.table.level',
    width:          120,
  },
  {
    name:           'rules',
    searchField:    'rules',
    translationKey: 'metricruletemplate.table.rule',
  },
];

export default Component.extend({
  modalService:     service('modal'),
  globalStore:      service(),
  settings:         service(),
  access:           service(),
  layout,
  headers,
  mode:             'global',
  sortBy:           'name',
  descending:       false,
  paging:           true,
  rightActions:     true,
  refresh:          null,

  metricRuleTemplates: null,

  actions: {
    showAlertTemplate(kind, mode) {
      get(this, 'modalService').toggleModal('modal-metric-rule-template', {
        closeWithOutsideClick: false,
        kind,
        mode,
        callback:              () => {
          setTimeout(() => {
            this.refresh();
          }, 500)
        },
      });
    },
    handleMenuClick(command, data) {
      switch (command) {
      case 'edit':
        this.send('showAlertTemplate', data.name, 'edit');
        break;
      case 'view':
        this.send('showAlertTemplate', data.name, 'view');
        break;
      case 'goToApi':
        data.links.self && window.open(data.links.self);
        break;
      }
    },
    sortChanged(sort) {
      const data = [];

      data.sort((a, b) => {
        if (a[sort.sortBy] > b[sort.sortBy]) {
          return sort.descending ? 1 : -1;
        }
        if (a[sort.sortBy] < b[sort.sortBy]) {
          return sort.descending ? -1 : 1;
        }

        return 0;
      });
      set(this, 'data', data);
    },
  },
  rows: computed('metricRuleTemplates.[]', function() {
    return get(this, 'metricRuleTemplates').map((t) => {
      let rules = Object.keys(t.data || {}) || [];

      return {
        ...t,
        rules: rules.join('，'),
      }
    })
  }),

  rowActions: computed('access.me.hasAdmin', function() {
    const hasAdmin = get(this, 'access.me.hasAdmin');

    let actions = [
      { divider: true, },
      {
        action: 'goToApi',
        icon:   'icon icon-external-link',
        label:  'action.viewInApi',
      }
    ];

    if (hasAdmin){
      actions.unshift({
        action:   'edit',
        icon:     'icon icon-edit',
        label:    'action.edit',
      },)
    } else {
      actions.unshift({
        action:   'view',
        icon:     'icon icon-file',
        label:    'action.view',
      },)
    }

    return actions;
  }),
});
