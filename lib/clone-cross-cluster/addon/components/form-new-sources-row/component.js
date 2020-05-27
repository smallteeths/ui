import Component from '@ember/component';
import layout from './template';
import { get, set, computed } from '@ember/object';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';

const SOURCES = [
  {
    id:       'configMap',
    label:    'Config Map',
  },
  {
    id:       'field',
    label:    'Field',
  },
  {
    id:       'resource',
    label:    'Resource',
  },
  {
    id:       'secret',
    label:    'Secret',
  }
];

export default Component.extend({
  modalService: service('modal'),

  layout,
  tagName:         'tr',
  secretOnly:      false,
  specificKeyOnly: false,
  model:           null,


  sources:        SOURCES,

  source:          alias('model.data'),
  actions: {
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

  prefixOrTarget: computed('source.sourceKey', {
    get() {
      if ( get(this, 'source.source') !== 'field' && (get(this, 'source.sourceKey') === null || get(this, 'source.sourceKey') === undefined) ) {
        return get(this, 'source.prefix');
      } else {
        return get(this, 'source.targetKey');
      }
    },
    set(key, value) {
      if ( get(this, 'source.source') !== 'field' && (get(this, 'source.sourceKey') === null || get(this, 'source.sourceKey') === undefined) ) {
        return set(this, 'source.prefix', value);
      } else {
        return set(this, 'source.targetKey', value);
      }
    }
  }),

  prefixOrKeys: computed('source.sourceName', 'model.refData', function() {
    let prefix = {
      id:    null,
      label: 'All'
    };
    let sourceType = get(this, 'source.source');
    let sourceName = get(this, 'source.sourceName');
    let out = get(this, 'specificKeyOnly') ? [] : [prefix];
    let selected;

    switch (sourceType) {
    case 'secret':
      selected = get(this, 'model.refData');
      break;
    case 'configMap':
      selected = get(this, 'model.refData');
      break;
    }

    if (sourceName) {
      if (selected && get(selected, 'data')) {
        let keys = Object.keys(get(selected, 'data'));

        if (keys) {
          keys.forEach((sk) => {
            out.addObject({
              id:    sk,
              label: sk
            });
          })
        }
      }
    }

    return out;
  }),

  doneEditSecret(secret, originSecret) {
    set(this, 'source.sourceName', secret.name);
    // set(this, 'model.refData', secret);
    this.updateSecret(secret, originSecret);
  },
  doneEditConfigMap(configMap, originConfigMap) {
    set(this, 'source.sourceName', configMap.name);
    // set(this, 'model.refData', configMap);
    this.updateConfigMap(configMap, originConfigMap);
  }
});
