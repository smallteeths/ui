
import Service, { inject as service } from '@ember/service';
import { get, set } from '@ember/object';
import { all as PromiseAll } from 'rsvp';
import AESEncrypt from 'shared/utils/crypto';

export default Service.extend({
  globalStore:  service(),
  harborServer: '',
  access:       service(),
  intl:         service(),
  loadHarborServerUrl() {
    return get(this, 'globalStore').rawRequest({ url: '/v3/settings/harbor-server-url' }).then((resp) => {
      const url = resp.body.value

      set(this, 'harborServer', url);

      return url;
    });
  },
  fetchSystemInfo() {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/systeminfo`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'GET',
    }).then((resp) => {
      const data = resp.body || {};

      if (!data.harbor_version) {
        return {
          ...data,
          supportSummary:          false,
          supportRoleLimitedGuest: false,
          supportRoleMaster:       false
        };
      }
      const subPos = data.harbor_version.indexOf('-');
      const version = data.harbor_version.substring(1, subPos).split('.').map((item) => parseInt(item, 10));

      return {
        ...data,
        supportSummary:          version[0] > 1 || (version[0] >= 1 && version[1] > 8),
        supportRoleLimitedGuest: version[0] > 1 || (version[0] >= 1 && version[1] > 9),
        supportRoleMaster:       version[0] > 1 || (version[0] >= 1 && version[1] > 7)
      }
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
  testHarborAccount(endpoint) {
    const headers = { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') }

    // if (u && p) {
    //   const b = AWS.util.base64.encode(`${ u }:${ p }`);

    //   headers['X-API-Harbor-Account-Header'] = b
    // }

    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ endpoint.replace('//', '/').replace(/\/+$/, '') }/api/users/current`,
      headers,
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
    const removeConfig = url === '' && u === '' && p === '';

    if (removeConfig) {
      const updateServerUrl = get(this, 'globalStore').rawRequest({
        url:    '/v3/settings/harbor-server-url',
        method: 'put',
        data:   JSON.stringify({ value: '' }),
      });
      const updateAuth = get(this, 'globalStore').rawRequest({
        url:     '/v3/settings/harbor-admin-auth ',
        method:  'put',
        data:    JSON.stringify({ value: '' }),
      });
      const updateHarborAuthMode = get(this, 'globalStore').rawRequest({
        url:    '/v3/settings/harbor-auth-mode',
        method: 'put',
        data:   JSON.stringify({ value: '' }),
      });

      return PromiseAll([updateServerUrl, updateAuth, updateHarborAuthMode])
    }

    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ url.replace('//', '/').replace(/\/+$/, '') }/api/systeminfo`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'get',
    }).then((resp) => {
      const data = resp.body || {};
      const authMode = data.auth_mode;
      const rancherAuthMode = (get(this, 'access.principal.id') || '').split(':')[0];

      // rancher ldap auth，support harbor harbor db_auth and ldap_auth
      // rancher other auth，support harbor db_auth

      if (!((rancherAuthMode === 'openldap_user_uid' && ['db_auth', 'ldap_auth'].indexOf(authMode) !== -1) || authMode === 'db_auth')) {
        return Promise.reject(this.intl.t('imageRepoSection.adminConfigPage.methodNotSupported', { auth: authMode.split('_')[0].toUpperCase() }))
      }

      const saveHarborConfig = get(this, 'globalStore').rawRequest({
        url:    '/v3/users?action=saveharborconfig',
        method: 'post',
        data:   JSON.stringify({
          serverURL: url.replace(/\/+$/, ''),
          username:  u,
          password:  AESEncrypt(p),
        }),
      }).then(() => {
        const updateServerUrl = get(this, 'globalStore').rawRequest({
          url:    '/v3/settings/harbor-server-url',
          method: 'put',
          data:   JSON.stringify({ value: url.replace(/\/+$/, '') }),
        });
        const updateAuth = get(this, 'globalStore').rawRequest({
          url:    '/v3/settings/harbor-admin-auth ',
          method: 'put',
          data:   JSON.stringify({ value: u }),
        });
        const updateHarborAuthMode = get(this, 'globalStore').rawRequest({
          url:    '/v3/settings/harbor-auth-mode',
          method: 'put',
          data:   JSON.stringify({ value: authMode }),
        });

        return Promise.all([updateServerUrl, updateAuth, updateHarborAuthMode])
      });

      return PromiseAll([saveHarborConfig, Promise.resolve({ harborSystemInfo: data })])
    });
  },
  syncHarborAccount(params) {
    const data = { ...params }

    if (data.password) {
      data.password = AESEncrypt(data.password)
    }
    const userId = get(this, 'access.me.id');

    return get(this, 'globalStore').rawRequest({
      url:    `/v3/users/${ userId }?action=setharborauth`,
      method: 'post',
      data:   JSON.stringify(data),
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
  fetchProjectSummary(project_id){
    return get(this, 'globalStore').rawRequest({
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      url:     `/meta/harbor/${ get(this, 'harborServer').replace('//', '/').replace(/\/+$/, '') }/api/projects/${ project_id }/summary`
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
  updateHarborPwd(userId, params) {
    const data = {
      ...params,
      newPassword: AESEncrypt(params.newPassword),
      oldPassword: AESEncrypt(params.oldPassword),
    }

    return get(this, 'globalStore').rawRequest({
      url:     `/v3/users/${ userId }?action=updateharborauth`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'post',
      data,
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
  },
  syncHarborUser(data) {
    this.loadHarborServerUrl().then((url) => {
      if (!url) {
        return;
      }

      return get(this, 'globalStore').rawRequest({
        url:    '/v3/users?action=syncharboruser',
        method: 'post',
        data,
      });
    });
  }
});
