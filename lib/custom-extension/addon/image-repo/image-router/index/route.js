import Route from '@ember/routing/route';
import { get } from '@ember/object';
import { inject as service } from '@ember/service';
import { hash, reject } from 'rsvp';

export default Route.extend({
  access:              service(),
  harbor:              service(),
  model() {
    let harborVersion = null;

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

    return hash({ harborVersion });
  },
  redirect(hash) {
    if (!!get(this, 'access.me.hasAdmin')) {
      return this.replaceWith('image-repo.image-router.admin-config.index');
    } else {
      if (hash.harborVersion && hash.harborVersion.version === 'v2.0') {
        return this.replaceWith('image-repo.image-router.user-config-v2.index');
      } else {
        return this.replaceWith('image-repo.image-router.user-config.index');
      }
    }
  },
});
