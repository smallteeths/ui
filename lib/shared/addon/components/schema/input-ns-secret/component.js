import { isArray } from '@ember/array';
import { next } from '@ember/runloop';
import { ucFirst } from 'shared/utils/util';
import { get, set, computed, observer } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import layout from './template';

export default Component.extend({
  intl: service(),

  nsResource: service(),

  layout,
  // Inputs
  type:        'secret',
  namespace:   null,
  selectClass: 'form-control',
  valueKey:    'name', // What to set the value as.. 'name' or 'id'

  // For use as a catalog question
  field: null,              // Read default from a schema resourceField
  value: null,              // name or id output string

  selected:         null,  // Selected secret ID
  projectSecrets:   null,
  namespaceSecrets: null,

  isInitDefaultValue: false,

  selectedChanged: observer('selected', function() {
    let id = get(this, 'selected');
    let str = null;

    if ( id ) {
      get(this, 'currentNsSecrets').then((secrets) => {
        let secret = secrets.findBy('value', id);

        if ( secret ) {
          set(this, 'selectedSecret', secret.raw);
          str = get(secret.raw, get(this, 'valueKey'));
        } else {
          set(this, 'selectedSecret', null);
        }
        set(this, 'value', str);
      })
    } else {
      set(this, 'value', str);
    }
  }),

  currentNsSecrets: computed('exclude', 'namespace.id', 'type', function() {
    const intl = get(this, 'intl');
    const namespaceId = get(this, 'namespace.id');

    return Promise.all([this.nsResource.findAll('secret'), this.nsResource.findAll('namespacedSecret', namespaceId)])
      .then(([projectSecrets, namespaceSecrets]) => {
        let out = projectSecrets.map((secret) => {
          return {
            label: get(secret, 'name'),
            value: get(secret, 'id'),
            group: intl.t('generic.project'),

            raw: secret,
          };
        });

        if (namespaceId && get(this, 'namespace.id') === namespaceId) {
          namespaceSecrets.filterBy('type', `namespaced${ ucFirst(get(this, 'type')) }`).reduce((t, secret) => {
            t.push({
              label: get(secret, 'name'),
              value: get(secret, 'id'),
              group: intl.t('generic.namespace'),

              raw: secret,
            });

            return t
          }, out);
        }
        let exclude = get(this, 'exclude');

        if ( exclude ) {
          if ( !isArray(exclude) ) {
            exclude = [exclude];
          }

          out = out.filter((x) => !exclude.includes(x.value));
        }

        return out.sortBy('group', 'label');
      }).catch(() => {
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
      var exact;

      const namespaceId = get(this, 'namespace.id');

      if ( namespaceId ) {
        get(this, 'currentNsSecrets').then((secrets) => {
          secrets.forEach(({ raw: secret }) => {
            if ( def === get(secret, get(this, 'valueKey')) && get(secret, 'namespaceId') === namespaceId) {
              exact = get(secret, 'id');
            }
          });
          set(this, 'selected', exact || null);
        })
      } else {
        set(this, 'selected', exact || null);
      }
    }
  },

});
