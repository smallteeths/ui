import Component from '@ember/component';
import { get, set } from '@ember/object'
import layout from './template';

export default Component.extend({
  layout,
  // Inputs
  editing:    true,
  namespace:  null,

  allEnv: [],

  env:     [],
  envFrom: [],

  namespaceConfigMaps: [],
  projectSecrets:      [],
  namespaceSecrets:    [],

  init() {
    this._super(...arguments);

    set(this, 'allEnv', [...this.env, ...this.envFrom]);
  },

  actions: {
    updateRow() {
      this.update();
    },

    removeRow(obj) {
      get(this, 'allEnv').removeObject(obj);
      this.update();
    },
  },

  update() {
    const envVarSource = [];
    const envVar = [];

    this.allEnv.forEach((row) => {
      if (!row.data) {
        return;
      }
      if (!!row.data.configMapRef || !!row.data.secretRef) {
        envVarSource.push(row);
      } else {
        envVar.push(row);
      }
    });

    set(this, 'env', envVar);
    set(this, 'envFrom', envVarSource);
  },

});
