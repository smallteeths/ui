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
const TS_TYPES = [
  {
    label: 'TCP',
    value: 'tcp'
  },
  {
    label: 'UDP',
    value: 'udp',
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
  isIpamLabel: false,

  readonlyAnnotations: ['f5.pandaria.io/targets'],

  isVirtualServer: true,
  transportModes:  TRANSPORT_MODES,
  tsTypeChoises:   TS_TYPES,
  primaryResource: null,

  init() {
    this._super(...arguments);

    if (!get(this, 'isAdd')) {
      set(this, 'namespace', get(this, 'f5.namespace'));
    }

    if (get(this, 'f5.ipamLabel')){
      set(this, 'isIpamLabel', true);
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

  isIpamLabelChanged: observer('isIpamLabel', function() {
    if (get(this, 'isIpamLabel')){
      set(this, 'f5.virtualServerAddress', '');
    } else {
      set(this, 'f5.ipamLabel', '');
    }
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
    });

    return out;
  }),

  generatePr() {
    const store = get(this, 'store');
    const f5 = get(this, 'f5');
    const profiles = get(this, 'tlsProfileChoices');
    const tlsProfileName = get(f5, 'tlsProfileName');
    let pr = null;

    if (get(this, 'isEdit')) {
      pr = f5;

      if (!get(this, 'isVirtualServer')) {
        set(pr, 'pool', get(pr, 'pools.firstObject'));
        set(pr, 'pools', null);
      }


      if (!tlsProfileName || !profiles.findBy('value', tlsProfileName)) {
        delete pr.tlsProfileName
      }

      if (!get(f5, 'waf')) {
        delete pr.waf;
      }

      if (!get(f5, 'snat')) {
        delete pr.snat;
      }

      if (!get(f5, 'virtualServerName')) {
        delete pr.virtualServerName;
      }

      if (!get(f5, 'rewriteAppRoot')) {
        delete pr.rewriteAppRoot;
      }

      if (!get(f5, 'ipamLabel')) {
        delete pr.ipamLabel;
      }

      if (!get(f5, 'virtualServerAddress')) {
        delete pr.virtualServerAddress;
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
        mode:              get(f5, 'mode'),
        tsType:            get(f5, 'tsType'),
      })
    }

    setProperties(pr, {
      name:                 get(f5, 'name'),
      namespaceId:          get(this, 'namespace.id'),
      description:          get(f5, 'description'),
      labels:               get(f5, 'labels'),
      annotations:          get(f5, 'annotations'),
    })

    if (get(f5, 'snat')) {
      set(pr, 'snat', get(f5, 'snat'))
    }

    if (get(f5, 'virtualServerName')) {
      set(pr, 'virtualServerName', get(f5, 'virtualServerName'))
    }

    if (get(f5, 'ipamLabel')) {
      set(pr, 'ipamLabel', get(f5, 'ipamLabel'))
    }
    if (get(f5, 'virtualServerAddress')) {
      set(pr, 'virtualServerAddress', get(f5, 'virtualServerAddress'))
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

    return ok;
  },

  doSave(opt) {
    let pr = get(this, 'primaryResource');

    let namespacePromise = resolve();

    opt = opt || {};
    opt.qp = { '_replace': 'true' };

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

    return namespacePromise.then(() => sup.apply(self, [opt]));
  },

  validate() {
    let pr = get(this, 'primaryResource');
    let errors = pr.validationErrors() || [];
    const intl = get(this, 'intl');

    if (!get(this, 'isIpamLabel') && !get(this, 'f5.virtualServerAddress')) {
      errors.unshift(intl.t('validation.required', { key: intl.t('f5CtlPage.form.url.label') }));
    }
    if (get(this, 'isIpamLabel') && !get(this, 'f5.ipamLabel')) {
      errors.unshift(intl.t('validation.required', { key: intl.t('f5CtlPage.form.ipam.label') }));
    }

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
