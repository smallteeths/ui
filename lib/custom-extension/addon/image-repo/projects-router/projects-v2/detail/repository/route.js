import Route from '@ember/routing/route';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';
let UUID = 0;

export default Route.extend({
  harborV2:     service(),
  harborServer: null,
  beforeModel() {
    this._super(...arguments);

    return get(this, 'harborV2').loadHarborServerUrl().then((resp) => {
      set(this, 'harborServer', resp);
    });
  },
  model(param) {
    const project = get(this, 'harborV2').fetchProject(param.project_id).then((resp) => resp.body);
    // const tags = get(this, 'harborV2').fetchTags(param.project_id, param.repository).then((resp) => {
    //   const data = resp.body;

    //   data.forEach((d) => {
    //     d.id = `tag_${ UUID++ }`;
    //     d.displayName = d.name;
    //   });

    //   return data;
    // });
    const labels = get(this, 'harborV2').fetchLabels({ scope: 'g' }).then((resp) => resp.body);
    const projectLabels = get(this, 'harborV2').fetchLabels({
      scope:      'p',
      project_id: param.project_id
    }).then((resp) => resp.body);
    const currentUser = get(this, 'harborV2').fetchCurrentHarborUser().then((resp) => resp.body);

    return hash({
      project,
      tags:              [],
      labels,
      projectLabels,
      projectId:         param.project_id,
      repository:        param.repository,
      harborServer:      get(this, 'harborServer'),
      currentUser,
      currentUserRoleId: param.current_user_role_id,
    }).then((hash) => {
      return get(this, 'harborV2').fetchTags({
        project_id:       param.project_id,
        project_name:     hash.project.name,
        repository_name:  param.repository,
      }).then((resp) => {
        const data = resp.body;

        console.log(hash.project.name)
        data.forEach((d) => {
          d.id = `tag_${ UUID++ }`;
          d.displayName = d.name;
        });

        hash.tags = data;

        return hash;
      });
    });
  },
  actions: {
    refreshModel() {
      this.refresh();
    }
  },
  queryParams: { name: { refreshModel: true } },
});