import Route from '@ember/routing/route';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';

export default Route.extend({
  harbor:       service(),
  access:       service(),
  harborServer: null,
  beforeModel() {
    this._super(...arguments);

    return get(this, 'harbor').loadHarborServerUrl().then((resp) => {
      set(this, 'harborServer', resp);
    });
  },
  model(param) {
    const project = get(this, 'harbor').fetchProject(param.project_id).then((resp) => resp.body);

    return hash({
      project,
      projectId: param.project_id
    });
  },
  redirect() {
    if (!get(this, 'access.admin')) {
      this.transitionTo('image-repo.projects.index');
    }
  },
});