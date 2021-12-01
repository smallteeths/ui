import Service, { inject as service } from '@ember/service';
import { get } from '@ember/object';
import C from 'ui/utils/constants';
import { alias } from '@ember/object/computed';

export default Service.extend({
  globalStore:    service(),
  cookies:        service(),
  apiMode:        alias(`cookies.${ C.COOKIE.API_MODE }`),

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
      url:    `/v3/project/${ projectId }/namespacedsecrets?limit=-1&sort=name${ this.apiMode ? '&_power=true' : '' }`,
      method: 'GET',
    });
  },
  loadConfigMaps(projectId) {
    return get(this, 'globalStore').rawRequest({
      url:    `/v3/project/${ projectId }/configmaps?limit=-1&sort=name${ this.apiMode ? '&_power=true' : '' }`,
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
      url:    `/v3/project/${ projectId }/persistentvolumeclaims?limit=-1&sort=name${ this.apiMode ? '&_power=true' : '' }`,
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
      url:    `/v3/project/${ projectId }/ingresses?limit=-1&sort=name${ this.apiMode ? '&_power=true' : '' }`,
      method: 'GET',
    });
  },
  loadServices(projectId) {
    return get(this, 'globalStore').rawRequest({
      url:    `/v3/project/${ projectId }/services?limit=-1&sort=name${ this.apiMode ? '&_power=true' : '' }`,
      method: 'GET',
    });
  },
  isServiceExist(projectId, name) {
    return get(this, 'globalStore').rawRequest({
      url:    `/v3/project/${ projectId }/services?name=${ encodeURIComponent(name) }&limit=-1&sort=name${ this.apiMode ? '&_power=true' : '' }`,
      method: 'GET',
    }).then((r) => ({
      exist: r.body.data.length > 0,
      name,
    }));
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
