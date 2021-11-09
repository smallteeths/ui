import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';
import { get } from '@ember/object';

export default Route.extend({
  globalStore: service(),

  model() {
    return get(this, 'globalStore').rawRequest({
      url:     '/v3/metricruletemplate',
      method:  'GET',
    }).then((res) => {
      return res?.body?.data || [];
    })
  },

  actions: {
    refreshModel() {
      this.refresh();
    }
  },
});
