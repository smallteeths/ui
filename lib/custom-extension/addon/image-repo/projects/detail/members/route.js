import Route from '@ember/routing/route';
import { get } from '@ember/object';
import { inject as service } from '@ember/service';
export default Route.extend({
  access: service(),
  model(param) {
    return { projectId: param.project_id };
  },
  redirect() {
    if (!get(this, 'access.admin')) {
      this.transitionTo('image-repo.projects.index');
    }
  },
});