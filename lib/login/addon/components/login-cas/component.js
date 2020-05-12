import { inject as service } from '@ember/service';
import Component from '@ember/component';

export default Component.extend({
  cas: service(),

  actions: {
    authenticate() {
      this.get('cas').login();
    }
  }
});
