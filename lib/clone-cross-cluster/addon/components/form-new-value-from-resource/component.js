import Component from '@ember/component';
import {
  computed, get, set, observer, setProperties
} from '@ember/object';
import layout from './template';
import { inject as service } from '@ember/service';

const typeOpts = [
  {
    value: 'simple',
    label: 'Key/Value Pair'
  },
  {
    value: 'resourceFieldRef',
    label: 'Resource'
  },
  {
    value: 'configMapKeyRef',
    label: 'ConfigMap Key'
  },
  {
    value: 'secretKeyRef',
    label: 'Secret key'
  },
  {
    value: 'fieldRef',
    label: 'Pod Field'
  },
  {
    value: 'secretRef',
    label: 'Secret'
  },
  {
    value: 'configMapRef',
    label: 'ConfigMap'
  },
];

const resourceKeyOpts = ['limits.cpu', 'limits.ephemeral-storage', 'limits.memory', 'requests.cpu', 'requests.ephemeral-storage', 'requests.memory']
  .map((k) => ({
    label: k,
    value: k,
  }));

export default Component.extend({
  intl: service(),

  modalService: service('modal'),

  layout,
  // Inputs
  refData: {},

  value:      { valueFrom: {} },
  refName:    null,
  name:       null,
  fieldPath:  null,
  referenced: null,
  key:        null,
  valStr:     null,

  typeOpts,
  resourceKeyOpts,

  update: null,
  remove: null,

  init() {
    this._super(...arguments);
    let type;

    if (this.value.secretRef) {
      type = 'secretRef';
    } else if (this.value.configMapRef) {
      type = 'configMapRef';
    } else if (this.value.value) {
      type = 'simple';
    } else if (this.value.valueFrom) {
      type = Object.keys((this.value.valueFrom))[0] || 'simple';
    }

    let refName;
    let name;
    let fieldPath;
    let key;
    let valStr;
    const keys = this.refData ? Object.keys(this.refData.data).map((k) => ({
      label: k,
      value: k
    })) : [];

    switch (type) {
    case 'resourceFieldRef':
      name = this.value.name;
      refName = this.value.valueFrom[type].containerName;
      key = this.value.valueFrom[type].resource || '';
      break;
    case 'configMapKeyRef':
      name = this.value.name;
      key = this.value.valueFrom[type].key || '';
      refName = this.value.valueFrom[type].name;
      break;
    case 'secretRef':
    case 'configMapRef':
      name = this.value.prefix;
      refName = this.value[type].name;
      break;
    case 'secretKeyRef':
      name = this.value.name;
      key = this.value.valueFrom[type].key || '';
      refName = this.value.valueFrom[type].name;
      break;
    case 'fieldRef':
      fieldPath = get(this.value.valueFrom, `${ type }.fieldPath`) || '';
      name = this.value.name;
      break;
    default:
      name = this.value.name;
      valStr = this.value.value;
      break;
    }

    setProperties(this, {
      typeOpts,
      type,
      refName,
      referenced: refName,
      keys,
      key,
      fieldPath,
      name,
      resourceKeyOpts,
      valStr,
    });
  },

  actions: {
    removeRow() {
      this.remove(this.value);
    },
    updateRow() {
      this.updateRow()
    },
    editSecret(secret) {
      get(this, 'modalService').toggleModal('custom-modal-edit-secret', {
        done:          this.doneEditSecret.bind(this),
        model:         secret,
        namespace:     this.targetNamespace || this.namespace
      });
    },
    editConfigMap(configMap) {
      get(this, 'modalService').toggleModal('custom-modal-edit-config-map', {
        done:          this.doneEditConfigMap.bind(this),
        model:         configMap,
        namespace:     this.targetNamespace || this.namespace
      });
    }
  },

  referencedDidChanged: observer('referenced', 'refData', function() {
    if (this.refData && ['secretRef', 'secretKeyRef', 'configMapRef', 'configMapKeyRef'].includes(this.type)) {
      set(this, 'keys', Object.keys(this.refData.data).map((k) => ({
        label: k,
        value: k
      })));
      set(this, 'refName', this.refData.name);
    }
    this.updateRow();
  }),


  needsSource: computed('type', function() {
    return this.type !== 'simple' && this.type !== 'resourceFieldRef' && this.type !== 'fieldRef' && !!this.type;
  }),

  sourceLabelPlaceholder: computed('type', function() {
    let out = {
      label:       '',
      placeholder: '',
    };
    const { type } = this;

    if (!type) {
      return;
    }

    switch (type) {
    case 'secretKeyRef':
    case 'secretRef':
      out.label = 'appDetailPage.secrets.title';
      out.placeholder = 'schema.inputSecret.secret';
      break;
    case 'configMapKeyRef':
    case 'configMapRef':
      out.label = 'appDetailPage.configMaps.title';
      out.placeholder = 'schema.inputConfigMap.prompt';
      break;
    default:
      out.label = 'formSources.source.label';
      out.placeholder = '';
    }

    return out;
  }),

  nameLabel: computed('type', function() {
    if (this.type === 'configMapRef' || this.type === 'secretRef') {
      return 'formSources.prefix.label';
    } else {
      return 'formAgentEnvVar.headers.variableName';
    }
  }),

  extraColumn: computed('type', function() {
    return ['resourceFieldRef', 'configMapKeyRef', 'secretKeyRef'].includes(this.type);
  }),

  typeSelected: computed('type', 'typeOpts', function() {
    return this.typeOpts.find((t) => t.value === this.type);
  }),

  updateRow() {
    if (!(this.name || '').length && !(this.refName || '').length) {
      if (this.type !== 'fieldRef') {
        set(this, 'value', null);
        this.update();

        return;
      }
    }
    let out = { name: this.name || this.refName };

    switch (this.type) {
    case 'configMapKeyRef':
    case 'secretKeyRef':
      out.valueFrom = {
        [this.type]: {
          key:      this.key,
          name:     this.refName,
          optional: false
        }
      };
      break;
    case 'resourceFieldRef':
      out.valueFrom = {
        [this.type]: {
          containerName: this.refName,
          divisor:       1,
          resource:      this.key
        }
      };
      break;
    case 'fieldRef':
      if (!this.fieldPath || !this.fieldPath.length) {
        out = null; break;
      }
      out.valueFrom = {
        [this.type]: {
          apiVersion: 'v1',
          fieldPath:  this.fieldPath
        }
      };
      break;
    case 'simple':
      out.value = this.valStr;
      break;
    default:
      delete out.name;
      out.prefix = this.name;
      out[this.type] = {
        name:     this.refName,
        optional: false
      };
    }
    set(this, 'value', out);
    this.update(out);
  },

  doneEditSecret(secret, originSecret) {
    set(this, 'referenced', secret.name);
    this.updateSecret(secret, originSecret);
  },
  doneEditConfigMap(configMap, originConfigMap) {
    set(this, 'referenced', configMap.name);
    this.updateConfigMap(configMap, originConfigMap);
  }

});
