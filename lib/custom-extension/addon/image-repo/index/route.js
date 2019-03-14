import Route from '@ember/routing/route';
import { get } from '@ember/object';
import { inject as service } from '@ember/service';

export default Route.extend({
  access:              service(),
  redirect() {
    if (!!get(this, 'access.admin')) {
      return this.replaceWith('image-repo.admin-config.index');
    } else {
      return this.replaceWith('image-repo.user-config.index');
    }
  },
});
