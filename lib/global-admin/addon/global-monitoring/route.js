import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { all as PromiseAll } from 'rsvp';
import C from 'ui/utils/constants';
import { get, set } from '@ember/object';
const NAME = 'global-monitoring';
const NAMESPACE_NAME = 'cattle-global-data';

export default Route.extend({
  globalStore: service(),

  model() {
    const clusters = this.globalStore.all('cluster');
    const globalMonitoringClusterId = this.globalStore.all('setting').findBy('id', C.SETTING.GLOBAL_MONITORING_CLUSTER_ID) || {};
    let cluster = clusters.findBy('id', globalMonitoringClusterId.value);
    const all = clusters.filterBy('state', 'active');
    let defaultCluster = false;

    if ( !cluster ) {
      if ( all.length > 0 ) {
        cluster = get(all, 'firstObject')
        set(globalMonitoringClusterId, 'value', cluster.id);
        defaultCluster = true;
      } else {
        return { noClusters: true }
      }
    }

    const project = cluster.systemProject;
    const apps = project.followLink('apps');
    const namespaces = cluster.followLink('namespaces');
    const storageClasses = cluster.followLink('storageClasses');
    const persistentVolumeClaims = project.followLink('persistentVolumeClaims')

    const requests = [apps, namespaces, storageClasses, persistentVolumeClaims];

    if (defaultCluster){
      requests.push(globalMonitoringClusterId.save());
    }

    return PromiseAll(requests).then((data) => {
      const apps = data[0] || [];
      const namespaces = data[1] || [];
      const storageClasses = data[2] || []
      const persistentVolumeClaims = data[3] || []
      const namespace = namespaces.findBy('name', NAMESPACE_NAME);

      return {
        app:                    apps.findBy('name', NAME),
        nsExists:               !!namespace,
        cluster,
        clusters:               all,
        project,
        storageClasses,
        namespace,
        persistentVolumeClaims: persistentVolumeClaims.filter((p) => p.namespaceId === NAMESPACE_NAME && p.state === 'bound'),
      }
    }).catch(() => {
      return {
        cluster,
        globalMonitoringClusterUnavailable: true
      }
    });
  },

  setupController(controller, model) {
    this._super(...arguments);
    if ( model.cluster ) {
      set(controller, 'clusterId', model.cluster.id);
    }
  },

  actions: {
    refresh() {
      this.refresh();
    },
  }
});
