import Controller from '@ember/controller';
import { get, computed } from '@ember/object';

export default Controller.extend({
  supportClone: computed('model.workloadForNew.labels', function() {
    const workloadLabels = get(this, 'model.workloadForNew.workload.workloadLabels');

    return !(workloadLabels && workloadLabels['io.cattle.field/appId']);
  }),
});
