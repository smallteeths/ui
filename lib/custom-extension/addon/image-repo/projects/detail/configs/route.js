import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { get } from '@ember/object';
export default Route.extend({
  access:              service(),
  model(param) {
    return { projectId: param.project_id };
  },
  redirect() {
    if (!get(this, 'access.admin')) {
      this.transitionTo('image-repo.projects.index');
    }
  },
});