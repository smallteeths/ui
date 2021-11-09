import { inject as service } from '@ember/service';
import Controller from '@ember/controller';

export default Controller.extend({
  globalStore:  service(),
  modalService: service('modal'),
  growl:        service(),
  settings:     service(),
  catalog:      service(),

  togglingHelmIncubator: false,
  togglingHelmStable:    false,
  togglingLibrary:       false,

  init() {
    this._super(...arguments);
  },

  actions: {
    refresh() {
      this.send('refreshModel');
    }
  },
});
