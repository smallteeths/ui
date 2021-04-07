import Route from '@ember/routing/route';
import { get } from '@ember/object';
import { inject as service } from '@ember/service';
import { hash, reject } from 'rsvp';

export default Route.extend({
  globalStore: service(),
  model() {
    let harborVersion = null;

    harborVersion = get(this, 'globalStore').rawRequest({ url: '/v3/settings/harbor-version' }).then((resp) => {
      const v = resp.body.value;

      return { version: v };
    }).catch((err) => {
      if (err.status === 404){
        return { version: '' };
      } else {
        return reject(err);
      }
    });

    return hash({ harborVersion });
  },
  redirect(hash) {
    if (hash.harborVersion && hash.harborVersion.version === 'v2.0') {
      return this.replaceWith('image-repo.logs-router.logs-v2');
    } else {
      return this.replaceWith('image-repo.logs-router.logs-v1');
    }
  },
});
