import Component from '@ember/component';
import { get, set, observer } from '@ember/object'
import layout from './template';
import { alias } from '@ember/object/computed';
// import { ucFirst } from 'shared/utils/util';
import { inject as service } from '@ember/service';



export default Component.extend({
  store: service(),

  layout,
  // Inputs
  editing:    true,
  namespace:  null,
  container:  {}, // container spec

  allEnv: [],

  configMaps: alias('namespace.configMaps'),

  init() {
    this._super(...arguments);
    const { env = [], envFrom = [] } = this.container;

    set(this, 'allEnv', [...env, ...envFrom].map((e) => ({ value: e })));
  },

  actions: {
    updateRow() {
      this.update();
    },

    removeRow(obj) {
      get(this, 'allEnv').removeObject(obj);
      this.update();
    },

    addFromReference() {
      get(this, 'allEnv').pushObject({
        value: {
          name:       '',
          valueFrom: {}
        }
      });
    }
  },

  ttyChanged: observer('contianer.tty', function() {
    if (get(this, 'contianer.tty')) {
      set(this, 'contianer.stdin', true);
    } else {
      set(this, 'contianer.stdin', false);
    }
  }),

  // namespaceDidChanged: observer('namespace', function() {
  //   set(this, 'allEnv', []);
  // }),
  // secrets:    computed('projectSecrets', 'namespaceSecrets', function() {
  //   return [...this.projectSecrets, ...this.namespaceSecrets];
  // }),

  update() {
    delete get(this, 'container.env');
    delete get(this, 'container.envFrom');
    const envVarSource = [];
    const envVar = [];

    this.allEnv.forEach((row) => {
      if (!row.value) {
        return;
      }
      if (!!row.value.configMapRef || !!row.value.secretRef) {
        envVarSource.push(row.value);
      } else {
        envVar.push(row.value);
      }
    });

    set(this, 'container.env', envVar);
    set(this, 'container.envFrom', envVarSource);
  },

});
