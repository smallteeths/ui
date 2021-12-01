import Mixin from '@ember/object/mixin';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import Errors from 'shared/utils/errors';
import { computed } from '@ember/object';
import C from 'ui/utils/constants';
import { normalizeType } from '@rancher/ember-api-store/utils/normalize';

export default Mixin.create({
  access:  service(),
  growl:   service(),
  cookies: service(),

  apiMode: computed(`cookies.${ C.COOKIE.API_MODE }`, function() {
    let apiMode = this.get(`cookies.${ C.COOKIE.API_MODE }`);

    if (!apiMode){
      return 'normal'
    }

    return apiMode;
  }),

  preload(type, storeName = 'store', opt = null) {
    opt = opt || {};

    type = normalizeType(type)

    const types = C.SUPPORT_POWER_API_TYPES

    if (types.map((t) => normalizeType(t, get(this, storeName))).includes(type) && this.apiMode === 'power'){
      opt.filter = {
        ...(opt.filter || {}),
        _power: true
      }
    }

    return get(this, storeName).find(type, null, opt);
  },

  loadSchemas(storeName) {
    var store = get(this, storeName);

    store.resetType('schema');

    return store.rawRequest({
      url:      'schema',
      dataType: 'json'
    }).then((xhr) => {
      store._state.foundAll['schema'] = true;
      store._bulkAdd('schema', xhr.body.data);
    });
  },

  loadingError(err, transition) {
    let isAuthFail = err && err.status && [401, 403].includes(err.status);

    var msg = Errors.stringify(err);

    console.log('Loading Error:', msg, err);
    if ( isAuthFail ) {
      set(this, 'access.enabled', true);
      transition.send('logout');
    } else {
      get(this, 'growl').fromError(err);
      this.replaceWith('global-admin.clusters');
    }
  },
});
