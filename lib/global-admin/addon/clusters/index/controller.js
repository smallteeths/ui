import { inject as service } from '@ember/service';
import Controller from '@ember/controller';
import { computed } from '@ember/object';

export default Controller.extend({
  settingsService: service('settings'),

  globalMonitoringUrl: computed('settingsService.globalMonitoringClusterId', function() {
    return `/k8s/clusters/${ this.settingsService.globalMonitoringClusterId }/api/v1/namespaces/cattle-global-data/services/http:access-dashboard:80/proxy/`
  }),

  grafanaUrl: computed('settingsService.globalMonitoringClusterId', function() {
    return `/k8s/clusters/${ this.settingsService.globalMonitoringClusterId }/api/v1/namespaces/cattle-global-data/services/http:access-grafana:80/proxy/`
  }),

  thanosUrl: computed('settingsService.globalMonitoringClusterId', function() {
    return `/k8s/clusters/${ this.settingsService.globalMonitoringClusterId }/api/v1/namespaces/cattle-global-data/services/http:access-thanos:80/proxy/`
  }),

  showMetricsTab: computed('model.clusters.@each.state', 'isAdminUse', 'settingsService.globalMonitoringEnabled', 'settingsService.globalMonitoringClusterId', function() {
    const cluster = this.model.clusters.findBy('id', this.settingsService.globalMonitoringClusterId);

    return cluster && cluster.state === 'active' && cluster.projects.findBy('isSystemProject', true) && this.settingsService.globalMonitoringEnabled === 'true';
  })
});
