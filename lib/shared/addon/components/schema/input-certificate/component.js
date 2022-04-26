import { isArray } from '@ember/array';
import { next } from '@ember/runloop';
import { ucFirst } from 'shared/utils/util';
import { get, set, computed, observer } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import layout from './template';

export default Component.extend({
  intl: service(),

  layout,
  // Inputs
  type:        'certificate',
  namespace:   null,
  selectClass: 'form-control',
  valueKey:    'name', // What to set the value as.. 'name' or 'id'

  // For use as a catalog question
  field: null,              // Read default from a schema resourceField
  value: null,              // name or id output string

  selected:              null,  // Selected secret ID
  projectCertificates:   null,
  namespaceCertificates: null,

  init() {
    this._super(...arguments);

    set(this, 'projectCertificates', get(this, 'store').all('certificate').filterBy('type', get(this, 'type')));
    set(this, 'namespaceCertificates', get(this, 'store').all('namespacedCertificate').filterBy('type', `namespaced${ ucFirst(get(this, 'type')) }`));

    let def = get(this, 'value') || get(this, 'field.default');

    if ( def && !get(this, 'selected') ) {
      var exact;

      get(this, 'projectCertificates').forEach((secret) => {
        if ( def === get(secret, get(this, 'valueKey')) ) {
          exact = get(secret, 'id');
        }
      });

      const namespaceId = get(this, 'namespace.id');

      if ( !exact && namespaceId ) {
        get(this, 'namespaceCertificates').forEach((secret) => {
          if ( def === get(secret, get(this, 'valueKey')) && get(secret, 'namespaceId') === namespaceId) {
            exact = get(secret, 'id');
          }
        });
      }

      next(() => {
        set(this, 'selected', exact || null);
      });
    }
  },

  selectedChanged: observer('selected', function() {
    let id = get(this, 'selected');
    let str = null;

    if ( id ) {
      let secret = get(this, 'projectCertificates').findBy('id', id) || get(this, 'namespaceCertificates').findBy('id', id);

      if ( secret ) {
        set(this, 'selectedCertificate', secret);
        str = get(secret, get(this, 'valueKey'));
      } else {
        set(this, 'selectedCertificate', null);
      }
    }

    set(this, 'value', str);
  }),

  namespaceDidChange: observer('namespace', function() {
    if (!this.filtered.find((item) => item.value === this.selected)) {
      set(this, 'selected', null);
      set(this, 'value', null);
    }
  }),

  filtered: computed('exclude', 'namespace.id', 'namespaceCertificates.[]', 'projectCertificates.[]', function() {
    const intl = get(this, 'intl');

    let out = get(this, 'projectCertificates').map((secret) => {
      return {
        label: get(secret, 'name'),
        value: get(secret, 'id'),
        group: intl.t('generic.project'),
      };
    });

    const namespaceId = get(this, 'namespace.id');

    if ( namespaceId ) {
      get(this, 'namespaceCertificates').filterBy('namespaceId', namespaceId).forEach((secret) => {
        out.push({
          label: get(secret, 'name'),
          value: get(secret, 'id'),
          group: intl.t('generic.namespace'),
        });
      });
    }

    let exclude = get(this, 'exclude');

    if ( exclude ) {
      if ( !isArray(exclude) ) {
        exclude = [exclude];
      }

      out = out.filter((x) => !exclude.includes(x.value));
    }

    return out.sortBy('group', 'label');
  }),

});
