import Route from '@ember/routing/route';
import { get } from '@ember/object';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';

export default Route.extend({
  access:              service(),
  harbor:              service(),
  model() {
    let harborVersion = null;

    harborVersion = get(this, 'harbor').fetchHarborVersion().then((resp) => {
      const v = resp.body.value;

      return { version: v };
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
