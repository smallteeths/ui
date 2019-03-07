import Route from '@ember/routing/route';
import { get } from '@ember/object';
import { inject as service } from '@ember/service';

export default Route.extend({
  access:              service(),
  redirect() {
    if (!!get(this, 'access.admin')) {
      this.transitionTo('custom-extension.image-repo.adminConfig.index');
    } else {
      this.transitionTo('custom-extension.image-repo.userConfig.index');
    }
  },
});
