import Service, { inject as service } from '@ember/service';
import { get } from '@ember/object';

export default Service.extend({
  globalStore:    service(),

  cloneApp(currentProjectId, data) {
    return get(this, 'globalStore').rawRequest({
      url:    `/v3/project/${ currentProjectId }/cloneapp`,
      method: 'POST',
      data,
    });
  },
  loadClusterNamespaces(clusterId) {
    return get(this, 'globalStore').rawRequest({
      url:    `/v3/cluster/${ clusterId }/namespaces?limit=-1&sort=name`,
      method: 'GET',
    });
  },
  loadProjectSecrets(projectId) {
    return get(this, 'globalStore').rawRequest({
      url:    `/v3/project/${ projectId }/secrets?limit=-1&sort=name`,
      method: 'GET',
    });
  },
  loadProjectNamespaceSecrets(projectId) {
    return get(this, 'globalStore').rawRequest({
      url:    `/v3/project/${ projectId }/namespacedsecrets?limit=-1&sort=name`,
      method: 'GET',
    });
  },
  loadConfigMaps(projectId) {
    return get(this, 'globalStore').rawRequest({
      url:    `/v3/project/${ projectId }/configmaps?limit=-1&sort=name`,
      method: 'GET',
    });
  },
  loadStorageClasses(clusterId) {
    return get(this, 'globalStore').rawRequest({
      url:    `/v3/cluster/${ clusterId }/storageclasses?limit=-1&sort=name`,
      method: 'GET',
    });
  },
  loadPvcs(projectId) {
    return get(this, 'globalStore').rawRequest({
      url:    `/v3/project/${ projectId }/persistentvolumeclaims?limit=-1&sort=name`,
      method: 'GET',
    });
  },
  loadPvs(clusterId) {
    return get(this, 'globalStore').rawRequest({
      url:    `/v3/cluster/${ clusterId }/persistentvolumes?limit=-1&sort=name`,
      method: 'GET',
    });
  },
  loadIngresses(projectId) {
    return get(this, 'globalStore').rawRequest({
      url:    `/v3/project/${ projectId }/ingresses?limit=-1&sort=name`,
      method: 'GET',
    });
  },
  loadServices(projectId) {
    return get(this, 'globalStore').rawRequest({
      url:    `/v3/project/${ projectId }/services?limit=-1&sort=name`,
      method: 'GET',
    });
  },
  loadCredentials(projectId) {
    return get(this, 'globalStore').rawRequest({
      url:    `/v3/project/${ projectId }/dockercredentials?limit=-1&sort=name`,
      method: 'GET',
    });
  },
  loadNamespaceCredentials(projectId) {
    return get(this, 'globalStore').rawRequest({
      url:    `/v3/project/${ projectId }/namespaceddockercredentials?limit=-1&sort=name`,
      method: 'GET',
    });
  }
});
