import { get, set, observer } from '@ember/object';
import { next, debounce } from '@ember/runloop';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import layout from './template';

export default Component.extend({
  vlansubnet: service(),
  scope:      service(),
  prefs:      service(),

  layout,
  field: null,
  value: null,

  selected: null,
  support:  true,

  macvlansubnetOptions: [],

  init() {
    this._super(...arguments);
    debounce(this, 'loadVlansubnets', 100);
  },

  selectedChanged: observer('selected', function() {
    let val = get(this, 'selected');
    let str = null;

    if ( val ) {
      const macvlansubnet = get(this, 'macvlansubnetOptions').findBy('value', val);

      if ( macvlansubnet ) {
        str = get(macvlansubnet, 'value');
      }
    }

    set(this, 'value', str);
  }),
  loadVlansubnets() {
    const p = {
      limit:         get(this, 'prefs.tablePerPage'),
      labelSelector: encodeURIComponent(`project in (${ (get(this, 'scope.currentProject.id') || '').replace(/[:]/g, '-') },)`)
    };
    const clusterId = get(this, 'scope.currentCluster.id');

    get(this, 'vlansubnet').fetchVlansubnets(clusterId, p).then((resp) => {
      set(this, 'macvlansubnetOptions', resp.body.data.map((item) => ({
        label:   item.name,
        value:   item.name,
        rawData: item,
      })));
      const def = get(this, 'value') || get(this, 'field.default');

      if ( def && !get(this, 'selected') ) {
        const exact = get(this, 'macvlansubnetOptions').findBy('value', def);

        next(() => {
          if ( exact ) {
            set(this, 'selected', get(exact, 'value') || null);
          } else {
            set(this, 'selected', null);
          }
        });
      }
    }).catch(() => {
      set(this, 'support', false);
    });
  }
});
