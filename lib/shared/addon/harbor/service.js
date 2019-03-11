
import Service, { inject as service } from '@ember/service';
import { get, set } from '@ember/object';
import { all as PromiseAll } from 'rsvp';

export default Service.extend({
  globalStore:    service(),
  harborServer:   '',
  access:         service(),
  loadHarborServerUrl() {
    return get(this, 'globalStore').rawRequest({ url: '/v3/settings/harbor-server' }).then((resp) => {
      const url = resp.body.value

      set(this, 'harborServer', url);

      return url;
    });
  },
  removeProjects(projectIds) {
    const promises = projectIds.map((id) => {
      return get(this, 'globalStore').rawRequest({
        url:     `/meta/harbor/${ get(this, 'harborServer') }/api/projects/${ id }`,
        headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
        method:  'delete',
      })
    });

    return PromiseAll(promises);
  },
  createProject(project) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/projects`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      method:  'post',
      data:    JSON.stringify(project),
    });
  },
  fetchProject(name) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/projects/${ name }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      method:  'get',
    });
  },
  fetchAdminConfig() {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/configurations`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      method:  'get',
    });
  },
  fetchHarborUserInfo() {
    return get(this, 'globalStore').rawRequest({ url: '/v3/settings/harbor-admin-auth' });
  },
  testHarborAccount(endpoint, u, p) {
    const b = btoa(`${ u }:${ p }`);

    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ endpoint }/api/users/current`,
      headers: {
        'X-API-Harbor-Admin-Header':   !!get(this, 'access.admin'),
        'X-API-Harbor-Account-Header': b,
      },
      method:  'get',
    });
  },
  addWhitelist(ip) {
    const url = '/v3/settings/whitelist-domain';

    return get(this, 'globalStore').rawRequest({ url }).then((resp) => {
      const wl = resp.body.value.split(',');

      wl.push(ip);

      return get(this, 'globalStore').rawRequest({
        url,
        method: 'put',
        data:   JSON.stringify({ value: [...new Set(wl)].join(',') })
      });
    })
  },
  saveHarborAccount(url, u, p) {
    const updateServerUrl = get(this, 'globalStore').rawRequest({
      url:    '/v3/settings/harbor-server',
      method: 'put',
      data:   JSON.stringify({ value: url }),
    });
    const updateAuth = get(this, 'globalStore').rawRequest({
      url:    '/v3/settings/harbor-admin-auth ',
      method: 'put',
      data:   JSON.stringify({ value: btoa(`${ u }:${ p }`) }),
    });

    return PromiseAll([updateServerUrl, updateAuth]);
  },
  syncHarborAccount(email, p) {
    const userId = get(this, 'access.me.id');

    return get(this, 'globalStore').rawRequest({
      url:    `/v3/users/${ userId }?action=setharborauth`,
      method: 'post',
      data:   JSON.stringify({
        email,
        password: p
      }),
    });
  },
  testEmailServer(config) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/email/ping`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      method:  'post',
      data:    JSON.stringify(config),
    });
  },
  updateAdminConfig(config) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/configurations`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      method:  'put',
      data:    JSON.stringify(config),
    });
  }
});