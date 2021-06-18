import { isArray } from '@ember/array';
import { next } from '@ember/runloop';
import { get, set, computed, observer } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import layout from './template';

export default Component.extend({
  intl: service(),

  nsResource: service(),

  layout,
  // Inputs
  namespace:   null,
  selectClass: 'form-control',
  valueKey:    'name', // What to set the value as.. 'name' or 'id'

  // For use as a catalog question
  field: null,              // Read default from a schema resourceField
  value: null,              // name or id output string

  selected:            null,  // Selected configMap ID
  namespaceConfigMaps: null,

  isInitDefaultValue: false,

  selectedValueChanged: observer('selected', function() {
    let id = get(this, 'selected');
    let str = null;

    if ( id ) {
      let configMap = get(this, 'currentNsConfigMaps.value').findBy('value', id);

      if ( configMap ) {
        set(this, 'selectedConfigMap', configMap.raw);
        str = get(configMap.raw, get(this, 'valueKey'));
      } else {
        set(this, 'selectedConfigMap', null);
      }
    }

    set(this, 'value', str);
  }),

  currentNsConfigMaps: computed('exclude', 'namespace.id', function() {
    const namespaceId = get(this, 'namespace.id')
    const intl = get(this, 'intl');

    return this.nsResource.findAll('configMap', namespaceId)
      .then((data) => {
        if (namespaceId === get(this, 'namespace.id')) {
          // set(this, 'namespaceConfigMaps', data)
          let out = data.map((configMap) => ({
            label: get(configMap, 'name'),
            value: get(configMap, 'id'),
            group: intl.t('generic.namespace'),

            raw: configMap,
          }));
          let exclude = get(this, 'exclude');

          if ( exclude ) {
            if ( !isArray(exclude) ) {
              exclude = [exclude];
            }

            out = out.filter((x) => !exclude.includes(x.value));
          }

          return out.sortBy('group', 'label');
        }

        return [];
      })
      .catch(() => {
        return []
      }).finally(() => {
        next(() => {
          this.initDefaultValue()
        })
      });
  }),

  initDefaultValue() {
    if (this.isInitDefaultValue) {
      return
    }
    set(this, 'isInitDefaultValue', true)
    let def = get(this, 'value') || get(this, 'field.default');

    if ( def && !get(this, 'selected') ) {
      let exact;

      const namespaceId = get(this, 'namespace.id');

      if ( namespaceId ) {
        get(this, 'currentNsConfigMaps.value').forEach(({ raw: configMap }) => {
          if ( def === get(configMap, 'name') && get(configMap, 'namespaceId') === namespaceId) {
            exact = get(configMap, 'id');
          }
        });
      }

      set(this, 'selected', exact || null);
    }
  },
});
