import Component from '@ember/component';
import { observer, get, set } from '@ember/object'
import { inject as service } from '@ember/service';
import layout from './template';

export default Component.extend({
  intl:         service(),
  scope:        service(),
  clusterStore: service(),
  layout,

  rules:     null,
  ruleArray: null,

  affinityType:        'affinity',
  affinityPriority:    'required',
  // namespaceSelection indicates whether a namespace state is selected as current or custom.
  namespaceSelection:  'current',
  // currentNamespace indicates the namespace to which the user's workload will be created.
  currentNamespace:    '',
  topologyKey:         '',

  namespaces:        [],
  podSchedulingType: [
    {
      label: 'Affinity',
      value: 'affinity',
    },
    {
      label: 'Anti-Affinity',
      value: 'antiAffinity',
    },
  ],
  podSchedulingPriority: [
    {
      label: 'Required',
      value: 'required',
    },
    {
      label: 'Preferred',
      value: 'preferred',
    },
  ],

  selectedNamespaces: [],

  init() {
    this._super(...arguments);
    const currentProjectsNamespaces = get(this, 'clusterStore').all('namespace').filterBy('projectId', get(this, 'scope.currentProject.id'));
    const selectedNamespaces = get(this, 'selectedNamespaces')

    if (currentProjectsNamespaces && currentProjectsNamespaces.length > 0) {
      set(this, 'namespaces', currentProjectsNamespaces.map((item) => {
        return item.name
      }))
    }
    // Determine the current namespace usage
    if (selectedNamespaces && !(selectedNamespaces.length === 0) && !(selectedNamespaces.length === 1 && selectedNamespaces[0] === get(this, 'currentNamespace')) ) {
      set(this, 'namespaceSelection', 'interactive');
    }
    this.initRuleArray();
  },

  actions: {
    addRule(custom) {
      const newRule = custom ? { custom: '' } : {
        key:      '',
        operator: '=',
        value:    ''
      };

      this.get('ruleArray').pushObject(newRule);
    },

    removeRule(rule) {
      this.get('ruleArray').removeObject(rule);
    },

    remove() {
      if (this.remove) {
        this.remove()
      }
    }
  },

  inputChanged: observer('ruleArray.@each.{key,value,operator,custom}', function() {
    this.set('rules', this.get('ruleArray')
      .filter((r) => this.isRuleValid(r))
      .map((r) => this.convertRule(r)));
  }),

  namespaceSelectionChange: observer('namespaceSelection', function() {
    if (get(this, 'namespaceSelection') === 'current') {
      set(this, 'selectedNamespaces', [get(this, 'currentNamespace')])
    } else {
      set(this, 'selectedNamespaces', [])
    }
  }),

  initRuleArray() {
    const rules = this.get('rules') || [];
    const ruleArray = rules.map((rule) => ({ custom: rule, }));

    this.set('ruleArray', ruleArray);
  },

  isRuleValid(rule) {
    if (rule.operator === 'Exists' || rule.operator === 'DoesNotExist') {
      return rule.key;
    } else {
      return rule.custom || (rule.value && rule.key && rule.operator);
    }
  },

  convertRule(rule) {
    if (rule.custom) {
      return rule.custom;
    }
    switch (rule.operator) {
    case 'Exists':
      return rule.key;
    case 'DoesNotExist':
      return `!${ rule.key }`;
    case 'In':
      return `${ rule.key } in (${ rule.value })`;
    case 'NotIn':
      return `${ rule.key } notin (${ rule.value })`;
    default:
      return `${ rule.key } ${ rule.operator } ${ rule.value }`;
    }
  },
})
