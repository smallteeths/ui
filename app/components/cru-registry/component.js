import { get, set, observer, computed } from '@ember/object';
import Component from '@ember/component';
import ViewNewEdit from 'shared/mixins/view-new-edit';
import OptionallyNamespaced from 'shared/mixins/optionally-namespaced';
import layout from './template';
import  { PRESETS_BY_NAME } from  'ui/models/dockercredential';
import { inject as service } from '@ember/service'
import { isEmpty } from '@ember/utils';
import { alias } from '@ember/object/computed';


const TEMP_NAMESPACE_ID = '__TEMP__';

export default Component.extend(ViewNewEdit, OptionallyNamespaced, {
  globalStore:  service(),
  clusterStore: service(),
  scopeService: service('scope'),
  harbor:       service(),

  layout,

  model:          null,
  titleKey:       'cruRegistry.title',
  scope:          'project',
  namespace:      null,
  asArray:        null,
  projectType:    'dockerCredential',
  namespacedType: 'namespacedDockerCredential',

  harborAccount: alias('harborConfig.harborAccount'),
  harborServer:  alias('harborConfig.harborServer'),

  init() {
    this._super(...arguments);

    if (get(this, 'model.type') === 'namespacedDockerCredential') {
      set(this, 'scope', 'namespace');
      set(this, 'namespace', get(this, 'model.namespace'));
    }
    const globalRegistryEnabled = get(this, 'globalStore').all('setting').findBy('id', 'global-registry-enabled') || {};

    set(this, 'globalRegistryEnabled', get(globalRegistryEnabled, 'value') === 'true')

    let asArray = JSON.parse(JSON.stringify(get(this, 'model.asArray') || []))

    if (!globalRegistryEnabled && get(this, 'mode') === 'new') {
      asArray = asArray.map((item) => {
        if (item.preset === get(this, 'hostname')) {
          return {
            ...item,
            preset: 'custom'
          }
        }

        return item
      })
    }

    const isHarborCred = get(this, 'model.labels') && get(this, 'model.labels')['rancher.cn/registry-harbor-auth'] === 'true';

    if (isHarborCred) {
      asArray.forEach((item) => {
        item.preset = 'harbor';
      });
    }
    set(this, 'asArray', asArray);
    this.arrayChanged();
  },

  arrayChanged: observer('asArray.@each.{preset,address,username,password,auth}', function() {
    const registries = {};

    get(this, 'asArray').forEach((obj) => {
      const preset = get(obj, 'preset');
      let key = get(obj, 'address');

      if ( PRESETS_BY_NAME[preset] ) {
        key = PRESETS_BY_NAME[preset];
      }

      let val = {};

      if (preset === 'harbor' && get(this, 'hasHarborAccount')) {
        const [username, password] = get(this, 'harborAccount').split(':');

        val.username = username;
        val.password = password;
        key = get(this, 'harborServer');
        key = key.indexOf('://') > -1 ? key.substr(key.indexOf('://') + 3) : key;
        set(this, 'model.labels', { 'rancher.cn/registry-harbor-auth': 'true' });
      } else {
        set(this, 'model.labels', null);
        ['username', 'password', 'auth'].forEach((k) => {
          let v = get(obj, k);

          if ( v ) {
            val[k] = v;
          }
        });
      }

      registries[key] = val;
    });

    set(this, 'model.registries', registries);

    return this._super(...arguments);
  }),

  hasHarborAccount: computed('harborAccount', function() {
    return !!get(this, 'harborAccount');
  }),

  harborUsername: computed('harborAccount', function() {
    const account = get(this, 'harborAccount');

    if (!account) {
      return null;
    }

    return account.split(':')[0];
  }),

  hostname:  window.location.host,

  willSave() {
    const { primaryResource: pr } = this;
    const nsId = this.namespace && this.namespace.id;

    set(pr, 'namespaceId', nsId ? nsId : TEMP_NAMESPACE_ID);

    let ok = this.validate();

    return ok;
  },

  validate() {
    this._super();

    const errors = get(this, 'errors') || [];

    if ( get(this, 'scope') === 'namespace' && isEmpty(get(this, 'primaryResource.namespaceId')) ) {
      errors.pushObjects(get(this, 'namespaceErrors') || []);
    }
    set(this, 'errors', errors);

    return errors.length === 0;
  },

  doSave() {
    let self                       = this;
    let sup                        = self._super;
    const { primaryResource: { namespaceId } } = this;

    if (isEmpty(namespaceId) || namespaceId === TEMP_NAMESPACE_ID) {
      return this.namespacePromise().then(() => sup.apply(self, arguments));
    } else {
      return sup.apply(self, arguments);
    }
  },

  doneSaving() {
    if (this.done) {
      this.done();
    }
  },
});
