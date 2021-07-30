import { inject as service } from '@ember/service';
import { observer, get, set } from '@ember/object';
import Component from '@ember/component';
import layout from './template';

export default Component.extend({
  scope: service(),

  layout,
  editing:    true,
  scheduling: null,

  currentNamespace: null,

  classNames: ['accordion-wrapper'],

  rules: [],

  init() {
    this._super(...arguments);
    this.initRules(get(this, 'scheduling'))
  },

  didReceiveAttrs() {
    if ( !get(this, 'expandFn') ) {
      set(this, 'expandFn', (item) => {
        item.toggleProperty('expanded');
      });
    }
  },

  actions: {
    addPodScheduling() {
      let rule = {
        affinityType:       'affinity',
        affinityPriority:   'required',
        currentNamespace:   get(this, 'currentNamespace.name'),
        selectedNamespaces: [get(this, 'currentNamespace.name')],
        expressions:        [],
        topology:           '',
      }

      get(this, 'rules').push(rule)
      set(this, 'rules', get(this, 'rules').map((item) => item))
    },

    remove(record) {
      let rules = get(this, 'rules').removeObject(record);

      set(this, 'rules', rules)
    },
  },

  rulesChanged: observer('rules.@each.{affinityType,affinityPriority,topology,selectedNamespaces.[],expressions.[]}', function() {
    if (get(this, 'rules') && get(this, 'rules').length > 0) {
      let obj = {}

      get(this, 'rules').forEach((item) => {
        let params = {
          expressions: item.expressions,
          namespaces:  item.selectedNamespaces,
          topology:    item.topology,
        }

        if (item.affinityType === 'affinity') {
          if (!obj.podAffinity) {
            obj.podAffinity = {}
          }
          if (item.affinityPriority === 'required') {
            if (!obj.podAffinity.required) {
              obj.podAffinity.required = [];
            }
            obj.podAffinity.required.push({ ...params })
          }
          if (item.affinityPriority === 'preferred') {
            if (!obj.podAffinity.preferred) {
              obj.podAffinity.preferred = [];
            }
            obj.podAffinity.preferred.push({ ...params })
          }
        } else {
          if (!obj.podAntiAffinity) {
            obj.podAntiAffinity = {}
          }
          if (item.affinityPriority === 'required') {
            if (!obj.podAntiAffinity.required) {
              obj.podAntiAffinity.required = [];
            }
            obj.podAntiAffinity.required.push({ ...params })
          }
          if (item.affinityPriority === 'preferred') {
            if (!obj.podAntiAffinity.preferred) {
              obj.podAntiAffinity.preferred = [];
            }
            obj.podAntiAffinity.preferred.push({ ...params })
          }
        }
      })
      if (obj.podAffinity) {
        set(this, 'scheduling.podAffinity', obj.podAffinity)
      } else {
        set(this, 'scheduling.podAffinity', {})
      }
      if (obj.podAntiAffinity) {
        set(this, 'scheduling.podAntiAffinity', obj.podAntiAffinity)
      } else {
        set(this, 'scheduling.podAntiAffinity', {})
      }
    } else {
      set(this, 'scheduling.podAffinity', {})
      set(this, 'scheduling.podAntiAffinity', {})
    }
  }),

  currentNamespaceChange: observer('currentNamespace.name', function() {
    let rules = get(this, 'rules').map((item) => {
      return {
        ...item,
        currentNamespace: get(this, 'currentNamespace.name'),
      }
    })

    set(this, 'rules', rules)
  }),

  initRules(scheduling) {
    let rules = []

    if (scheduling.podAffinity) {
      if (scheduling.podAffinity.required && scheduling.podAffinity.required.length > 0) {
        let params = {
          affinityType:       'affinity',
          affinityPriority:   'required',
          currentNamespace:   get(this, 'currentNamespace.name'),
        }

        scheduling.podAffinity.required.forEach((item) => {
          let rule = {
            selectedNamespaces: item.namespaces,
            expressions:        item.expressions,
            topology:           item.topology,
            ...params
          }

          rules.push(rule)
        })
      }
      if (scheduling.podAffinity.preferred && scheduling.podAffinity.preferred.length > 0) {
        let params = {
          affinityType:       'affinity',
          affinityPriority:   'preferred',
          currentNamespace:   get(this, 'currentNamespace.name'),
        }

        scheduling.podAffinity.preferred.forEach((item) => {
          let rule = {
            selectedNamespaces: item.namespaces,
            expressions:        item.expressions,
            topology:           item.topology,
            ...params
          }

          rules.push(rule)
        })
      }
    }
    if (scheduling.podAntiAffinity) {
      if (scheduling.podAntiAffinity.required && scheduling.podAntiAffinity.required.length > 0) {
        let params = {
          affinityType:       'antiAffinity',
          affinityPriority:   'required',
          currentNamespace:   get(this, 'currentNamespace.name'),
        }

        scheduling.podAntiAffinity.required.forEach((item) => {
          let rule = {
            selectedNamespaces: item.namespaces,
            expressions:        item.expressions,
            topology:           item.topology,
            ...params
          }

          rules.push(rule)
        })
      }
      if (scheduling.podAntiAffinity.preferred && scheduling.podAntiAffinity.preferred.length > 0) {
        let params = {
          affinityType:       'antiAffinity',
          affinityPriority:   'preferred',
          currentNamespace:   get(this, 'currentNamespace.name'),
        }

        scheduling.podAntiAffinity.preferred.forEach((item) => {
          let rule = {
            selectedNamespaces: item.namespaces,
            expressions:        item.expressions,
            topology:           item.topology,
            ...params
          }

          rules.push(rule)
        })
      }
    }

    set(this, 'rules', rules);
  }
});
