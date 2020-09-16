
import Service, { inject as service } from '@ember/service';
import { get } from '@ember/object';
import { all as PromiseAll } from 'rsvp';
import AESEncrypt from 'shared/utils/crypto';

export default Service.extend({
  globalStore:   service(),
  harbor:        service(),
  access:        service(),
  intl:          service(),
  harborVersion: '/v2.0',
  loadHarborServerUrl() {
    return get(this, 'harbor').loadHarborServerUrl()
  },
  fetchSystemInfo() {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/systeminfo`,
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
        url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/projects/${ id }`,
        headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
        method:  'DELETE',
      })
    });

    return PromiseAll(promises);
  },
  createProject(project) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/projects`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'POST',
      data:    JSON.stringify(project),
    });
  },
  fetchProject(id) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/projects/${ id }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'GET',
    });
  },
  fetchAdminConfig() {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/configurations`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'GET',
    });
  },
  fetchHarborUserInfo() {
    return get(this, 'globalStore').rawRequest({ url: '/v3/settings/harbor-admin-auth' });
  },
  fetchHarborVersion() {
    return get(this, 'globalStore').rawRequest({ url: '/v3/settings/harbor-version' });
  },
  testHarborAccount(endpoint) {
    const headers = { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') }

    // if (u && p) {
    //   const b = AWS.util.base64.encode(`${ u }:${ p }`);

    //   headers['X-API-Harbor-Account-Header'] = b
    // }

    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ endpoint.replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/users/current`,
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
  saveHarborAccount(url, u, p, v) { // for admin user
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

      const updateVersion = get(this, 'globalStore').rawRequest({
        url:    '/v3/settings/harbor-version',
        method: 'put',
        data:   JSON.stringify({ value: '' }),
      });

      return PromiseAll([updateServerUrl, updateAuth, updateHarborAuthMode, updateVersion])
    }

    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ url.replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/systeminfo`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'get',
    }).then((resp) => {
      const data = resp.body || {};
      const authMode = data.auth_mode;
      // const rancherAuthMode = (get(this, 'access.principal.id') || '').split(':')[0];

      // rancher ldap and ad auth，support harbor harbor db_auth and ldap_auth
      // rancher other auth，support harbor db_auth

      // if (!((['openldap_user_uid', 'activedirectory_user_uid'].indexOf(rancherAuthMode) !== -1 && ['db_auth', 'ldap_auth'].indexOf(authMode) !== -1) || authMode === 'db_auth')) {
      //   return Promise.reject(this.intl.t('imageRepoSection.adminConfigPage.methodNotSupported', { auth: authMode.split('_')[0].toUpperCase() }))
      // }

      const saveHarborConfig = get(this, 'globalStore').rawRequest({
        url:    '/v3/users?action=saveharborconfig',
        method: 'post',
        data:   JSON.stringify({
          serverURL: url.replace(/\/+$/, ''),
          username:  u,
          password:  AESEncrypt(p),
          version:   v,
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
        const updateVersion = get(this, 'globalStore').rawRequest({
          url:    '/v3/settings/harbor-version',
          method: 'put',
          data:   JSON.stringify({ value: v }),
        });
        const updateHarborAuthMode = get(this, 'globalStore').rawRequest({
          url:    '/v3/settings/harbor-auth-mode',
          method: 'put',
          data:   JSON.stringify({ value: authMode }),
        });

        return Promise.all([updateServerUrl, updateAuth, updateHarborAuthMode, updateVersion])
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
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/email/ping`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'POST',
      data:    JSON.stringify(config),
    });
  },
  updateAdminConfig(config) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/configurations`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'PUT',
      data:    JSON.stringify(config),
    });
  },
  fetchLabels(param) {
    const p = Object.keys(param).map((k) => `${ k }=${ param[k] }`);

    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/labels?${ p.join('&') }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'GET',
    });
  },
  updateLabel(label) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/labels/${ label.id }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'PUT',
      data:     JSON.stringify(label),
    });
  },
  createLabel(label) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/labels`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'POST',
      data:    label,
    });
  },
  removeLabels(labelIds) {
    const promises = labelIds.map((id) => {
      return get(this, 'globalStore').rawRequest({
        url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/labels/${ id }`,
        headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
        method:  'DELETE',
      });
    });

    return PromiseAll(promises);
  },
  fetchSchedule() {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/system/gc/schedule`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'GET',
    });
  },
  updateSchedule(s) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/system/gc/schedule`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'PUT',
      data:    JSON.stringify(s)
    });
  },
  getProjectDetail(id){
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/projects/${ id }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'GET',
    });
  },
  fetchRepo(param) {
    return get(this, 'globalStore').rawRequest({
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/projects/${ param.project_name }/repositories${ param.q.replace(param.project_name, '') }`,
    })
  },
  deleteRepos(names){
    const promises = names.map((n) => {
      return get(this, 'globalStore').rawRequest({
        url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/repositories/${ n }`,
        headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
        method:  'DELETE',
      });
    });

    return PromiseAll(promises);
  },
  fetchTags(param) {
    // EncodeURIComponent twice for harbor2.0
    let repoName = param.repository_name.replace(`${ param.project_name }/`, '').replace('/', '%252F')

    return get(this, 'globalStore').rawRequest({
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/projects/${ param.project_name }/repositories/${ repoName }/artifacts?with_tag=true&with_scan_overview=true&with_label=true&page_size=15&page=1`,
    })
  },
  removeTags(project, repo, digests) {
    let repoName = repo.replace(`${ project }/`, '').replace('/', '%252F')

    const promises = digests.map((digest) => {
      return get(this, 'globalStore').rawRequest({
        url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/projects/${ project }/repositories/${ repoName }/artifacts/${ digest }`,
        headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
        method:  'DELETE',
      });
    });

    return PromiseAll(promises);
  },
  addTagLabels(project, repo, digest, labels) {
    let repoName = repo.replace(`${ project }/`, '').replace('/', '%252F')

    const promises = labels.map((label) => {
      return get(this, 'globalStore').rawRequest({
        url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/projects/${ project }/repositories/${ repoName }/artifacts/${ digest }/labels`,
        headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
        method:  'POST',
        data:    JSON.stringify(label)
      });
    });

    return PromiseAll(promises);
  },
  removeTagLabels(project, repo, digest, labelIds) {
    let repoName = repo.replace(`${ project }/`, '').replace('/', '%252F')

    const promises = labelIds.map((id) => {
      return get(this, 'globalStore').rawRequest({
        url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/projects/${ project }/repositories/${ repoName }/artifacts/${ digest }/labels/${ id }`,
        headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
        method:  'DELETE',
      });
    });

    return PromiseAll(promises);
  },
  setProjectPublic(s, id) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/projects/${ id }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'PUT',
      data:    JSON.stringify(s)
    });
  },

  fetchProjectsAndImages(q) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/search?q=${ encodeURIComponent(q) }`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'GET',
    });
  },
  addProjectUser(params, id) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/projects/${ id }/members`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'post',
      data:    params,
    });
  },
  projectChangeRole(id, memeberId, params) {
    const promises = memeberId.map((memeberId) => {
      get(this, 'globalStore').rawRequest({
        url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/projects/${ id }/members/${ memeberId }`,
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
        url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/projects/${ id }/members/${ memeberId }`,
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
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/projects?${ params }`,
    })
  },
  fetchLogs(p) {
    const params = Object.entries(p).map((p) => {
      if (p[0] === 'page' || p[0] === 'page_size' ) {
        return `${ p[0] }=${ p[1] }`
      } else {
        return `q=${ encodeURIComponent(`${ p[0] }%3D~${ p[1] }`) }`
      }
    }).join('&');

    return get(this, 'globalStore').rawRequest({
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/${ get(this, 'harborVersion') ? 'audit-logs' : 'logs' }?${ params }`
    })
  },
  fetchProjectSummary(project_id){
    return get(this, 'globalStore').rawRequest({
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/projects/${ project_id }/summary`
    })
  },
  fetchProjectImages(p) {
    const params = Object.entries(p.q).map((item) => {
      if (item[0] === 'page' || item[0] === 'page_size' ) {
        return `${ item[0] }=${ item[1] }`
      } else {
        return `q=${ encodeURIComponent(`${ item[0] }%3D~${ item[1] }`) }`
      }
    }).join('&');

    return get(this, 'globalStore').rawRequest({
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/projects/${ p.name }/repositories?${ params }`
    })
  },
  fetchProjectMembersList( project_id, p ) {
    const params = Object.entries(p).map((p) => `${ p[0] }=${ p[1] }`).join('&');

    return get(this, 'globalStore').rawRequest({
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/projects/${ project_id }/members?${ params }`
    })
  },
  fetchProjectLogs(projectId, p) {
    const params = Object.entries(p).map((p) => {
      if (p[0] === 'page' || p[0] === 'page_size' ) {
        return `${ p[0] }=${ p[1] }`
      } else {
        return `q=${ encodeURIComponent(`${ p[0] }%3D~${ p[1] }`) }`
      }
    }).join('&');

    return get(this, 'globalStore').rawRequest({
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/projects/${ projectId }/logs?${ params }`
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
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/users/current`,
      headers: { 'X-API-Harbor-Admin-Header': !!get(this, 'access.me.hasAdmin') },
      method:  'GET',
    });
  },
  fetchProjectMembers(projectId, entityName) {
    return get(this, 'globalStore').rawRequest({
      url:     `/meta/harbor/${ get(this, 'harbor.harborServer').replace('//', '/').replace(/\/+$/, '') }/api${ get(this, 'harborVersion') }/projects/${ projectId }/members?entityname=${ entityName }`,
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
