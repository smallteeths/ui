import Route from '@ember/routing/route';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';

export default Route.extend({
  harbor:       service(),
  access:       service(),
  globalStore:  service(),
  prefs:        service(),
  harborServer:       '',
  beforeModel() {
    this._super(...arguments);
    let harborServer = null;

    harborServer = get(this, 'harbor').loadHarborServerUrl().then((resp) => {
      set(this, 'harborServer', resp);
    });

    return hash({ harborServer });
  },
  model(param) {
    return get(this, 'harbor').getProjectDetail(param.project_id).then((resp) => {
      let metaData = resp.body.metadata;

      metaData.public === 'false' ? metaData.public = false : metaData.public = true;

      return {
        metaData,
        projectId: param.project_id
      };
    })
  },
  actions: {
    refreshModel() {
      this.refresh();
    }
  },
});