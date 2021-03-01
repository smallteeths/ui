import { resolve } from 'rsvp';
import {
  get, set, computed, observer, setProperties
} from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import NewOrEdit from 'shared/mixins/new-or-edit';
import layout from './template';

const TRANSPORT_MODES = [
  {
    label: 'Standard',
    value: 'standard'
  },
  {
    label: 'Performance',
    value: 'performance',
  }
]

export default Component.extend(NewOrEdit, {
  intl:  service(),
  scope: service(),
  store: service(),

  layout,
  mode:        null,
  f5:          null,
  editing:     null,
  tlsProfiles: null,

  readonlyAnnotations: ['f5.pandaria.io/targets'],

  isVirtualServer: true,
  transportModes:  TRANSPORT_MODES,
  primaryResource: null,

  init() {
    this._super(...arguments);

    if (!get(this, 'isAdd')) {
      set(this, 'namespace', get(this, 'f5.namespace'));
    }
  },
  actions: {
    done() {
      if (this.done) {
        this.done();
      }
    },
    cancel() {
      if (this.cancel) {
        this.cancel();
      }
    },

    setLabels(labels) {
      let out = {};

      labels.forEach((row) => {
        out[row.key] = row.value;
      });

      set(this, 'f5.labels', out);
    },
  },

  namespaceChanged: observer('namespace.id', function() {
    set(this, 'f5.tlsProfileName', null);
  }),

  isNew: computed('mode', function() {
    return get(this, 'mode') === 'new';
  }),

  isEdit: computed('mode', function() {
    return get(this, 'mode') === 'edit';
  }),

  isView: computed('mode', function() {
    return get(this, 'mode') === 'view';
  }),

  tlsProfileChoices: computed('tlsProfiles', 'namespace.id', function() {
    const out = [];

    (get(this, 'tlsProfiles') || []).filter((f) => {
      if (!get(this, 'namespace.id')) {
        return false;
      }

      return f.namespaceId === get(this, 'namespace.id');
    }).forEach((f) => {
      out.push({
        label: f.name,
        value: f.name
      })
    })

    return out;
  }),

  generatePr() {
    const store = get(this, 'store');
    const f5 = get(this, 'f5');
    let pr = null;

    if (get(this, 'isEdit')) {
      pr = f5;

      if (!get(this, 'isVirtualServer')) {
        set(pr, 'pool', get(pr, 'pools.firstObject'));
        set(pr, 'pools', null);
      }


      if (!get(pr, 'tlsProfileName')) {
        set(pr, 'tlsProfileName', '');
      }

      set(this, 'primaryResource', pr);

      return;
    }

    if (get(this, 'isVirtualServer')) {
      pr = store.createRecord({
        type:                   'virtualserver',
        pools:                  get(f5, 'pools'),
        host:                   get(f5, 'host'),
        virtualServerHTTPPort:  get(f5, 'virtualServerHTTPPort'),
        virtualServerHTTPSPort: get(f5, 'virtualServerHTTPSPort'),
      })

      if (get(f5, 'tlsProfileName')) {
        set(pr, 'tlsProfileName', get(f5, 'tlsProfileName'))
      }

      if (get(f5, 'rewriteAppRoot')) {
        set(pr, 'rewriteAppRoot', get(f5, 'rewriteAppRoot'))
      }

      if (get(f5, 'waf')) {
        set(pr, 'waf', get(f5, 'waf'))
      }
    } else {
      pr = store.createRecord({
        type:              'transportserver',
        pool:              get(f5, 'pools.firstObject'),
        virtualServerPort: get(f5, 'virtualServerPort'),
        mode:              get(f5, 'mode')
      })
    }

    setProperties(pr, {
      name:                 get(f5, 'name'),
      namespaceId:          get(this, 'namespace.id'),
      description:          get(f5, 'description'),
      labels:               get(f5, 'labels'),
      annotations:          get(f5, 'annotations'),
      virtualServerAddress: get(f5, 'virtualServerAddress'),
    })

    if (get(f5, 'snat')) {
      set(pr, 'snat', get(f5, 'snat'))
    }

    if (get(f5, 'virtualServerName')) {
      set(pr, 'virtualServerName', get(f5, 'virtualServerName'))
    }

    set(this, 'primaryResource', pr);
  },

  willSave() {
    const a = get(this, 'f5.labels') || {};

    a['f5cr'] = 'true';

    set(this, 'f5.labels', a);

    // set TransportSever or VirtualServer
    this.generatePr();

    const pr = get(this, 'primaryResource');

    // Namespace is required, but doesn't exist yet... so lie to the validator
    let nsId = get(pr, 'namespaceId');

    set(pr, 'namespaceId', '__TEMP__');
    let ok = this.validate();

    set(pr, 'namespaceId', nsId);
    // macvlan

    console.log(pr.tlsProfileName)

    return ok;
  },

  doSave() {
    let pr = get(this, 'primaryResource');

    let namespacePromise = resolve();

    if (get(this, 'isAdd')) {
      // Set the namespace ID
      if (get(this, 'namespace.id')) {
        set(pr, 'namespaceId', get(this, 'namespace.id'));
      } else if (get(this, 'namespace')) {
        namespacePromise = get(this, 'namespace').save()
          .then((newNamespace) => {
            set(pr, 'namespaceId', get(newNamespace, 'id'));

            return newNamespace.waitForState('active');
          });
      }
    }

    let self = this;
    let sup = self._super;

    return namespacePromise.then(() => sup.apply(self, arguments));
  },

  validate() {
    let pr = get(this, 'primaryResource');
    let errors = pr.validationErrors() || [];

    errors.pushObjects(get(this, 'namespaceErrors') || []);

    if (errors.length) {
      set(this, 'errors', errors.uniq());

      return false;
    }

    return true;
  },

  doneSaving() {
    this._super(...arguments);
    this.send('done');
  },
});
