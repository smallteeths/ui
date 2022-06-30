import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import C from 'ui/utils/constants';
import { get } from '@ember/object';

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
      const cluster = clusters.findBy('id', globalMonitoringClusterId.value) || {};
      const project = get(cluster, 'systemProject');

      if (project){
        try {
          return project.followLink('apps').then((apps) => {
            return {
              clusters,
              globalMonitoring: apps.findBy('name', 'global-monitoring')
            }
          });
        } catch (err) {
          return { clusters };
        }
      }

      return { clusters };
    });
  },
});
