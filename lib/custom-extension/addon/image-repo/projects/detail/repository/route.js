import Route from '@ember/routing/route';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';
let UUID = 0;

export default Route.extend({
  harbor:       service(),
  harborServer: null,
  beforeModel() {
    this._super(...arguments);

    return get(this, 'harbor').loadHarborServerUrl().then((resp) => {
      set(this, 'harborServer', resp);
    });
  },
  model(param) {
    const project = get(this, 'harbor').fetchProject(param.project_id).then((resp) => resp.body);
    const repo = get(this, 'harbor').fetchRepo({
      project_id: param.project_id,
      q:          param.repository,
    }).then((resp) => resp.body);
    const tags = get(this, 'harbor').fetchTags(param.project_id, param.repository).then((resp) => {
      const data = resp.body;

      data.forEach((d) => {
        d.id = `tag_${ UUID++ }`;
      });

      return data;
    });
    const labels = get(this, 'harbor').fetchLabels({ scope: 'g' }).then((resp) => resp.body);
    const projectLabels = get(this, 'harbor').fetchLabels({
      scope:      'p',
      project_id: param.project_id
    }).then((resp) => resp.body);

    return hash({
      project,
      repo,
      tags,
      labels,
      projectLabels,
      projectId:    param.project_id,
      repository:   param.repository,
      harborServer: get(this, 'harborServer'),
    });
  },
  actions: {
    refreshModel() {
      this.refresh();
    }
  },
  queryParams: { name: { refreshModel: true } },
});