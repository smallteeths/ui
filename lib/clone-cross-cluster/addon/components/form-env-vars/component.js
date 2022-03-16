import Component from '@ember/component';
import { get, set, observer } from '@ember/object'
import layout from './template';



export default Component.extend({
  layout,
  // Inputs
  editing:    true,
  namespace:  null,
  container: {},

  allEnv: [],

  env:     [],
  envFrom: [],

  namespaceConfigMaps: [],
  projectSecrets:      [],
  namespaceSecrets:    [],

  init() {
    this._super(...arguments);

    set(this, 'allEnv', [...this.env, ...this.envFrom].map((e) => ({ value: e })));
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

  update() {
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

    set(this, 'env', envVar);
    set(this, 'envFrom', envVarSource);
  },

});
