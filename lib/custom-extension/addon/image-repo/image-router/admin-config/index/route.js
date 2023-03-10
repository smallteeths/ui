import Route from '@ember/routing/route';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { hash, reject } from 'rsvp';

export default Route.extend({
  harbor:       service(),
  harborV2:     service(),
  access:       service(),
  globalStore:  service(),
  settings:     service(),
  harborServer: '',
  beforeModel() {
    this._super(...arguments);

    return get(this, 'harbor').loadHarborServerUrl().then((resp) => {
      set(this, 'harborServer', resp);
    });
  },
  model() {
    let harborUser = null;
    let harborVersion = null;

    if (get(this, 'harborServer')) {
      harborUser = get(this, 'harbor').fetchHarborUserInfo().then((resp) => {
        const v = resp.body.value;
        const decodeV = AWS.util.base64.decode(v).toString();

        if (decodeV.indexOf(':') !== -1) {
          return {
            name:    decodeV.split(':')[0],
            invalid: true
          }
        }

        return { name: v };
      });

      harborVersion = get(this, 'harbor').fetchHarborVersion().then((resp) => {
        const v = resp.body.value;

        return { version: v };
      }).catch((err) => {
        if (err.status === 404){
          return { version: '' };
        } else {
          return reject(err);
        }
      });
    }

    return hash({
      harborUser,
      harborVersion,
      harborServer:     get(this, 'harborServer'),
      harborSystemInfo: {}
    })
  },
  afterModel(model) {
    if (model.harborServer) {
      if (model.harborVersion.version === 'v2.0') {
        return this.harborV2.fetchSystemInfo().then((resp) => {
          set(model, 'harborSystemInfo', resp)
        }).catch((err) => {
          console.error('fetch harbor system info failed: ', err)
        })
      } else {
        return this.harbor.fetchSystemInfo().then((resp) => {
          set(model, 'harborSystemInfo', resp)
        }).catch((err) => {
          console.error('fetch harbor system info failed: ', err)
        })
      }
    }
  },
  redirect(hash) {
    if (!get(this, 'access.me.hasAdmin')) {
      if (hash.harborVersion && hash.harborVersion.version === 'v2.0') {
        return this.replaceWith('image-repo.user-config-v2.index');
      } else {
        return this.replaceWith('image-repo.user-config.index');
      }
    }
  },
  setupController(controller, model) {
    if (model.harborVersion && model.harborVersion.version === 'v2.0'){
      set(controller, 'harborService', 'harborV2')
    } else {
      set(controller, 'harborService', 'harbor')
    }
    set(controller, 'harborInsecureSkipVerify', get(this, 'settings.harbor-insecure-skip-verify') ?? false)
    this._super(controller, model);
  },
  actions: {
    refreshModel() {
      this.refresh();
    }
  },
});
