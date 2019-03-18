
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
        method:  'DELETE',
      })
    });

    return PromiseAll(promises);
  },
  createProject(project) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/projects`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      method:  'POST',
      data:    JSON.stringify(project),
    });
  },
  fetchProject(id) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/projects/${ id }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      method:  'GET',
    });
  },
  fetchAdminConfig() {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/configurations`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      method:  'GET',
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
      method:  'GET',
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
      method:  'POST',
      data:    JSON.stringify(config),
    });
  },
  updateAdminConfig(config) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/configurations`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      method:  'PUT',
      data:    JSON.stringify(config),
    });
  },
  fetchLabels(param) {
    const p = Object.keys(param).map((k) => `${ k }=${ param[k] }`);

    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/labels?${ p.join('&') }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      method:  'GET',
    });
  },
  updateLabel(label) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/labels/${ label.id }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      method:  'PUT',
      data:     JSON.stringify(label),
    });
  },
  createLabel(label) {
    debugger

    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/labels`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      method:  'POST',
      data:    JSON.stringify(label),
    });
  },
  removeLabels(labelIds) {
    const promises = labelIds.map((id) => {
      return get(this, 'globalStore').rawRequest({
        url:     `/meta/harbor/${ get(this, 'harborServer') }/api/labels/${ id }`,
        headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
        method:  'DELETE',
      });
    });

    return PromiseAll(promises);
  },
  fetchSchedule() {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/system/gc/schedule`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      method:  'GET',
    });
  },
  updateSchedule(s) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/system/gc/schedule`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      method:  'PUT',
      data:    JSON.stringify(s)
    });
  },
  getProjectDetail(id){
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/projects/${ id }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      method:  'GET',
    });
  },
  fetchRepo(param) {
    const p = Object.entries(param).map((item) => `${ item[0] }=${ item[1] }`).join('&');

    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/repositories?${ p }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      method:  'GET',
    });
  },
  deleteMirror(name){
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/repositories/${ name }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      method:  'DELETE',
    });
  },
  fetchTags(projectId, name) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/repositories/${ name }/tags?detail=${ projectId }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      method:  'GET',
    });
  },
  removeTags(repo, tags) {
    const promises = tags.map((tag) => {
      return get(this, 'globalStore').rawRequest({
        url:     `/meta/harbor/${ get(this, 'harborServer') }/api/repositories/${ repo }/tags/${ tag }`,
        headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
        method:  'DELETE',
      });
    });

    return PromiseAll(promises);
  },
  addTagLabels(repo, tag, labelIds) {
    const promises = labelIds.map((labelId) => {
      return get(this, 'globalStore').rawRequest({
        url:     `/meta/harbor/${ get(this, 'harborServer') }/api/repositories/${ repo }/tags/${ tag }/labels`,
        headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
        method:  'POST',
        data:    JSON.stringify({ id: labelId })
      });
    });

    return PromiseAll(promises);
  },
  removeTagLabels(repo, tag, labelIds) {
    const promises = labelIds.map((labelId) => {
      return get(this, 'globalStore').rawRequest({
        url:     `/meta/harbor/${ get(this, 'harborServer') }/api/repositories/${ repo }/tags/${ tag }/labels/${ labelId }`,
        headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
        method:  'DELETE',
      });
    });

    return PromiseAll(promises);
  },
  setProjectPublic(s, id) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/projects/${ id }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      method:  'PUT',
      data:    JSON.stringify(s)
    });
  },

  fetchProjectsAndImages(q) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/search?q=${ encodeURIComponent(q) }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      method:  'GET',
    });
  },
  addProjectUser(params, id) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer') }/api/projects/${ id }/members`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
      method:  'post',
      data:    params,
    });
  },
  projectChangeRole(id, memeberId, params) {
    const promises = memeberId.map((memeberId) => {
      get(this, 'globalStore').rawRequest({
        url:     `/meta/harbor/${ get(this, 'harborServer') }/api/projects/${ id }/members/${ memeberId }`,
        headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
        method:  'put',
        data:    params
      });
    });

    return PromiseAll(promises);
  },
  projectDeleteMemberRole(id, memeberId) {
    const promises = memeberId.map((memeberId) => {
      get(this, 'globalStore').rawRequest({
        url:     `/meta/harbor/${ get(this, 'harborServer') }/api/projects/${ id }/members/${ memeberId }`,
        headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.admin') },
        method:  'delete'
      });
    });

    return PromiseAll(promises);
  }
});