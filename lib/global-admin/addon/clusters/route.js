import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import C from 'ui/utils/constants';

export default Route.extend({
  globalStore: service(),

  model() {
    const store = this.get('globalStore');

    return store.findAll('cluster').then((/* resp */) => {
      const clusters = store.all('cluster');

      if (clusters.length > 0) {
        clusters.forEach((cluster) => {
          cluster.store.findAll('etcdbackup');
        });
      }

      const globalMonitoringClusterId = this.globalStore.all('setting').findBy('id', C.SETTING.GLOBAL_MONITORING_CLUSTER_ID) || {};
      let cluster = clusters.findBy('id', globalMonitoringClusterId.value);

      if (cluster){
        const project = cluster.systemProject;

        return project.followLink('apps').then((apps) => {
          return {
            clusters,
            globalMonitoring: apps.findBy('name', 'global-monitoring')
          }
        });
      }

      return { clusters };
    });
  },
});
