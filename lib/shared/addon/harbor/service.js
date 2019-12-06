
import Service, { inject as service } from '@ember/service';
import { get, set } from '@ember/object';
import { all as PromiseAll } from 'rsvp';

export default Service.extend({
  globalStore:    service(),
  harborServer:   '',
  access:         service(),
  loadHarborServerUrl() {
    return get(this, 'globalStore').rawRequest({ url: '/v3/settings/harbor-server-url' }).then((resp) => {
      const url = resp.body.value

      set(this, 'harborServer', url);

      return url;
    });
  },
  removeProjects(projectIds) {
    const promises = projectIds.map((id) => {
      return get(this, 'globalStore').rawRequest({
        url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/projects/${ id }`,
        headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
        method:  'DELETE',
      })
    });

    return PromiseAll(promises);
  },
  createProject(project) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/projects`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'POST',
      data:    JSON.stringify(project),
    });
  },
  fetchProject(id) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/projects/${ id }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'GET',
    });
  },
  fetchAdminConfig() {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/configurations`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'GET',
    });
  },
  fetchHarborUserInfo() {
    return get(this, 'globalStore').rawRequest({ url: '/v3/settings/harbor-admin-auth' });
  },
  testHarborAccount(endpoint, u, p) {
    const b = AWS.util.base64.encode(`${ u }:${ p }`);

    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ endpoint.replace('//', '/').replace(/\/+$/, '') }/api/users/current`,
      headers: {
        'X-API-Harbor-Admin-Header':   !!get(this, 'access.me.hasAdmin'),
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
  saveHarborAccount(url, u, p) { // for admin user
    const updateServerUrl = get(this, 'globalStore').rawRequest({
      url:    '/v3/settings/harbor-server-url',
      method: 'put',
      data:   JSON.stringify({ value: url.replace(/\/+$/, '') }),
    });
    const updateAuth = get(this, 'globalStore').rawRequest({
      url:    '/v3/settings/harbor-admin-auth ',
      method: 'put',
      data:   JSON.stringify({ value: AWS.util.base64.encode(`${ u }:${ p }`) }),
    });

    return PromiseAll([updateServerUrl, updateAuth]);
  },
  saveAdminAuth(username, pwd) {
    return get(this, 'globalStore').rawRequest({
      url:    '/v3/settings/harbor-admin-auth ',
      method: 'put',
      data:   JSON.stringify({ value: AWS.util.base64.encode(`${ username }:${ pwd }`) }),
    });
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
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/email/ping`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'POST',
      data:    JSON.stringify(config),
    });
  },
  updateAdminConfig(config) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/configurations`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'PUT',
      data:    JSON.stringify(config),
    });
  },
  fetchLabels(param) {
    const p = Object.keys(param).map((k) => `${ k }=${ param[k] }`);

    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/labels?${ p.join('&') }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'GET',
    });
  },
  updateLabel(label) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/labels/${ label.id }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'PUT',
      data:     JSON.stringify(label),
    });
  },
  createLabel(label) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/labels`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'POST',
      data:    label,
    });
  },
  removeLabels(labelIds) {
    const promises = labelIds.map((id) => {
      return get(this, 'globalStore').rawRequest({
        url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/labels/${ id }`,
        headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
        method:  'DELETE',
      });
    });

    return PromiseAll(promises);
  },
  fetchSchedule() {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/system/gc/schedule`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'GET',
    });
  },
  updateSchedule(s) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/system/gc/schedule`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'PUT',
      data:    JSON.stringify(s)
    });
  },
  getProjectDetail(id){
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/projects/${ id }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'GET',
    });
  },
  fetchRepo(param) {
    const p = Object.entries(param).map((item) => `${ item[0] }=${ item[1] }`).join('&');

    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/repositories?${ p }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'GET',
    });
  },
  deleteRepos(names){
    const promises = names.map((n) => {
      return get(this, 'globalStore').rawRequest({
        url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/repositories/${ n }`,
        headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
        method:  'DELETE',
      });
    });

    return PromiseAll(promises);
  },
  fetchTags(projectId, name) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/repositories/${ name }/tags?detail=${ projectId }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'GET',
    });
  },
  removeTags(repo, tags) {
    const promises = tags.map((tag) => {
      return get(this, 'globalStore').rawRequest({
        url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/repositories/${ repo }/tags/${ tag }`,
        headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
        method:  'DELETE',
      });
    });

    return PromiseAll(promises);
  },
  addTagLabels(repo, tag, labelIds) {
    const promises = labelIds.map((labelId) => {
      return get(this, 'globalStore').rawRequest({
        url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/repositories/${ repo }/tags/${ tag }/labels`,
        headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
        method:  'POST',
        data:    JSON.stringify({ id: labelId })
      });
    });

    return PromiseAll(promises);
  },
  removeTagLabels(repo, tag, labelIds) {
    const promises = labelIds.map((labelId) => {
      return get(this, 'globalStore').rawRequest({
        url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/repositories/${ repo }/tags/${ tag }/labels/${ labelId }`,
        headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
        method:  'DELETE',
      });
    });

    return PromiseAll(promises);
  },
  setProjectPublic(s, id) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/projects/${ id }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'PUT',
      data:    JSON.stringify(s)
    });
  },

  fetchProjectsAndImages(q) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/search?q=${ encodeURIComponent(q) }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'GET',
    });
  },
  addProjectUser(params, id) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/projects/${ id }/members`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'post',
      data:    params,
    });
  },
  projectChangeRole(id, memeberId, params) {
    const promises = memeberId.map((memeberId) => {
      get(this, 'globalStore').rawRequest({
        url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/projects/${ id }/members/${ memeberId }`,
        headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
        method:  'put',
        data:    params
      });
    });

    return PromiseAll(promises);
  },
  projectDeleteMemberRole(id, memeberId) {
    const promises = memeberId.map((memeberId) => {
      get(this, 'globalStore').rawRequest({
        url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/projects/${ id }/members/${ memeberId }`,
        headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
        method:  'delete'
      });
    });

    return PromiseAll(promises);
  },
  fetchProjects(p) {
    const params = Object.entries(p).filter((p) => p[1] !== '').map((p) => `${ p[0] }=${ p[1] }`).join('&');

    return get(this, 'globalStore').rawRequest({
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/projects?${ params }`,
    })
  },
  fetchLogs(p) {
    const params = Object.entries(p).map((p) => `${ p[0] }=${ p[1] }`).join('&');

    return get(this, 'globalStore').rawRequest({
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/logs?${ params }`
    })
  },
  fetchProjectImages(p) {
    const params = Object.entries(p).map((p) => `${ p[0] }=${ p[1] }`).join('&');

    return get(this, 'globalStore').rawRequest({
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/repositories?${ params }`
    })
  },
  fetchProjectMembersList( project_id, p ) {
    const params = Object.entries(p).map((p) => `${ p[0] }=${ p[1] }`).join('&');

    return get(this, 'globalStore').rawRequest({
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/projects/${ project_id }/members?${ params }`
    })
  },
  fetchProjectLogs(projectId, p) {
    const params = Object.entries(p).map((p) => `${ p[0] }=${ p[1] }`).join('&');

    return get(this, 'globalStore').rawRequest({
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/projects/${ projectId }/logs?${ params }`
    })
  },
  changPwd(userId, params) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/users/${ userId }/password`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'put',
      data:    params
    });
  },
  userChangeHarborAccount(userId, params) {
    return get(this, 'globalStore').rawRequest({
      url:     `/v3/users/${ userId }?action=updateharborauth`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'post',
      data:    params
    });
  },
  fetchCurrentHarborUser() {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/users/current`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'GET',
    });
  },
  fetchProjectMembers(projectId, entityName) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/projects/${ projectId }/members?entityname=${ entityName }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'GET',
    });
  }
});