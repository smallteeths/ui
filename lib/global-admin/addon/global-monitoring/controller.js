import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { set, observer } from '@ember/object';
import C from 'ui/utils/constants';

export default Controller.extend({
  settings:    service(),
  globalStore: service(),
  clusterId:   null,
  loading:     false,

  actions:  {
    cancel() {
      this.transitionToRoute('index');
    },
  },

  clusterIdDidChange: observer('clusterId', function() {
    if ( this.clusterId === this.settings.globalMonitoringClusterId) {
      return;
    }
    set(this, 'loading', true);
    const cluster = this.model.clusters.findBy('id', this.clusterId);

    this.globalStore.find('setting', C.SETTING.GLOBAL_MONITORING_ENABLED)
      .then((s) => {
        set(s, 'value', 'false');
        s.save().then(() => {
          this.globalStore.find('setting', C.SETTING.GLOBAL_MONITORING_CLUSTER_ID)
            .then((s) => {
              set(s, 'value', cluster.id);
              s.save()
                .then(() => {
                  set(this, 'loading', false);
                  this.send('refresh');
                });
            })
        });
      });
  }),
});
