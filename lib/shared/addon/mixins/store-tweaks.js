import { inject as service } from '@ember/service';
import Mixin from '@ember/object/mixin';
import C from 'ui/utils/constants';
import { computed } from '@ember/object';
import { normalizeType } from '@rancher/ember-api-store/utils/normalize';
import RSVP from 'rsvp';

export default Mixin.create({
  cookies: service(),

  defaultPageSize:   -1,
  removeAfterDelete: false,

  get headers() {
    let out = {
      [C.HEADER.ACTIONS]:      C.HEADER.ACTIONS_VALUE,
      [C.HEADER.NO_CHALLENGE]: C.HEADER.NO_CHALLENGE_VALUE
    };

    let csrf = this.get(`cookies.${ C.COOKIE.CSRF }`);

    if ( csrf ) {
      out[C.HEADER.CSRF] = csrf;
    }

    return out;
  },

  apiMode: computed(C.PREFS.API_MODE, `cookies.${ C.COOKIE.API_MODE }`, function() {
    let apiMode = this.get(`cookies.${ C.COOKIE.API_MODE }`);

    if (!apiMode){
      return 'normal'
    }

    return apiMode;
  }),

  findAll(type, opt){
    type = normalizeType(type, this);
    opt = opt || {};

    const types = C.SUPPORT_POWER_API_TYPES;

    if (types.map((t) => normalizeType(t, this)).includes(type) && this.apiMode === 'power'){
      opt.filter = {
        _power: true,
        ...(opt.filter || {}),
      }
    }

    if ( this.haveAll(type) && this.isCacheable(opt) ) {
      return RSVP.resolve(this.all(type), `All ${  type  } already cached`);
    } else {
      return this.find(type, undefined, opt).then(() => {
        return this.all(type);
      });
    }
  },

  isCacheable(opt) {
    const onlyParallelInFilter = opt.filter && Object.keys(opt.filter).length === 1 && Object.keys(opt.filter)[0] === '_power';

    return !opt || (opt.depaginate && (!opt.filter || onlyParallelInFilter) && !opt.forceReload);
  },
});
