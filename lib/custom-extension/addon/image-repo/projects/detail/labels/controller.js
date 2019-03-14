import Controller from '@ember/controller';
import { get, computed } from '@ember/object';

export default Controller.extend({
  labelParam: computed('model.projectId', function() {
    return {
      scope:      'p',
      project_id: get(this, 'model.projectId')
    }
  })
});