import Route from '@ember/routing/route';
import { get } from '@ember/object';
import { inject as service } from '@ember/service';
export default Route.extend({
  access: service(),
  beforeModel() {
    this._super(...arguments);

    if (!get(this, 'access.currentUser.hasAdmin')) {
      this.transitionTo('image-repo.projects.index');

      return;
    }
  },
  model(param) {
    return { projectId: param.project_id };
  },
});
