import { inject as service } from '@ember/service';
import Controller from '@ember/controller';
import { get, computed } from '@ember/object';
import { compare as compareVersion } from 'ui/utils/parse-version';

export default Controller.extend({
  settingsService: service('settings'),

  globalMonitoringUrl: computed('settingsService.globalMonitoringClusterId', function() {
    return `/k8s/clusters/${ this.settingsService.globalMonitoringClusterId }/api/v1/namespaces/cattle-global-data/services/http:access-dashboard:80/proxy/`
  }),

  grafanaUrl: computed('settingsService.globalMonitoringClusterId', function() {
    return `/k8s/clusters/${ this.settingsService.globalMonitoringClusterId }/api/v1/namespaces/cattle-global-data/services/http:access-grafana:80/proxy/`
  }),

  thanosUrl: computed('model', 'settingsService.globalMonitoringClusterId', function() {
    const externalId = get(this.model, 'globalMonitoring.externalId') || '';
    const splitVersion = externalId.split('version=');
    const currentVersion = splitVersion[1];

    if (compareVersion('0.1.1', currentVersion) > 0){
      return `/k8s/clusters/${ this.settingsService.globalMonitoringClusterId }/api/v1/namespaces/cattle-global-data/services/http:access-thanos:80/proxy/`
    }

    return '/global-monitoring/graph';
  }),

  showMetricsTab: computed('model.clusters.@each.state', 'isAdminUse', 'settingsService.globalMonitoringEnabled', 'settingsService.globalMonitoringClusterId', function() {
    const cluster = this.model.clusters.findBy('id', this.settingsService.globalMonitoringClusterId);

    return cluster && cluster.state === 'active' && cluster.projects.findBy('isSystemProject', true) && this.settingsService.globalMonitoringEnabled === 'true';
  })
});
