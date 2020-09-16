import Route from '@ember/routing/route';
import { get } from '@ember/object';
import { inject as service } from '@ember/service';

export default Route.extend({
  globalStore:   service(),
  redirect() {
    return get(this, 'globalStore').rawRequest({ url: '/v3/settings/harbor-version' }).then((resp) => {
      const version = resp.body.value

      if (version === 'v2.0') {
        return this.replaceWith('image-repo.projects-router.projects-v2.index');
      } else {
        return this.replaceWith('image-repo.projects-router.projects-v1.index');
      }
    });
  },
});