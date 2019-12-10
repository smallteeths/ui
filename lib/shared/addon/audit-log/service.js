import Service, { inject as service } from '@ember/service';
import { get, computed } from '@ember/object';

export default Service.extend({
  globalStore:    service(),
  access:         service(),
  settings:       service(),
  auditLogServer: computed('settings', function() {
    var all = get(this, 'settings.asMap');

    return `${ all['auditlog-server-url'] && all['auditlog-server-url']['value'] }`;
  }),

  fetchClusterAuditLogs(clusterID, params = {}) {
    const query = Object.entries(params).map((e) => `${ e[0] }=${ e[1] }`).join('&');
    const logs = get(this, 'globalStore').rawRequest({ url: `/meta/auditlog/${ get(this, 'auditLogServer').replace('//', '/') }/v1/auditlogs?clusterID=${ clusterID }&${ query }` });

    this.showLoading()

    return Promise.all([logs]).then((data) => {
      const [logsResp] = data;

      this.hideLoading()
      logsResp.body.data.forEach((d) => {
        d.responseCode = this.responseCodeFilter(d.responseCode);
      });

      return logsResp;
    }).catch((data) => {
      this.hideLoading();

      return Promise.reject(data);
    });
  },
  fetchWorkloadAuditLogs(clusterID, projectID, params) {
    const query = Object.entries(params).map((e) => `${ e[0] }=${ e[1] }`).join('&');
    const logs = get(this, 'globalStore').rawRequest({ url: `/meta/auditlog/${ get(this, 'auditLogServer').replace('//', '/') }/v1/auditlogs?clusterID=${ clusterID }&projectID=${ projectID }&${ query }` });

    this.showLoading()

    return Promise.all([logs]).then((data) => {
      const [logsResp] = data;

      this.hideLoading()
      logsResp.body.data.forEach((d) => {
        d.responseCode = this.responseCodeFilter(d.responseCode);
      });

      return logsResp;
    }).catch((data) => {
      this.hideLoading();

      return Promise.reject(data);
    });
  },
  fetchWorkloadItemAuditLogs(clusterID, projectID, workloadId, params) {
    const query = Object.entries(params).map((e) => `${ e[0] }=${ e[1] }`).join('&');
    const logs = get(this, 'globalStore').rawRequest({ url: `/meta/auditlog/${ get(this, 'auditLogServer').replace('//', '/') }/v1/auditlogs?querypage=workload&clusterID=${ clusterID }&projectID=${ projectID }&requestResType=workload&requestResId=${ workloadId }&${ query }` });

    this.showLoading()

    return Promise.all([logs]).then((data) => {
      const [logsResp] = data;

      this.hideLoading()
      logsResp.body.data.forEach((d) => {
        d.responseCode = this.responseCodeFilter(d.responseCode);
      });

      return logsResp;
    }).catch((data) => {
      this.hideLoading();

      return Promise.reject(data);
    });
  },
  fetchRancherAuditLogs(params) {
    const query = Object.entries(params).map((e) => `${ e[0] }=${ e[1] }`).join('&');
    const logs = get(this, 'globalStore').rawRequest({ url: `/meta/auditlog/${ get(this, 'auditLogServer').replace('//', '/') }/v1/auditlogs?clusterID=global&${ query }` });

    this.showLoading()

    return Promise.all([logs]).then((data) => {
      const [logsResp] = data;

      this.hideLoading()
      logsResp.body.data.forEach((d) => {
        d.responseCode = this.responseCodeFilter(d.responseCode);
      });

      return logsResp;
    }).catch((data) => {
      this.hideLoading();

      return Promise.reject(data);
    });
  },
  fetchRancherAuditResources() {
    return get(this, 'globalStore').rawRequest({ url: `/meta/auditlog/${ get(this, 'auditLogServer').replace('//', '/') }/v1/resources` });
  },
  responseCodeFilter(code) {
    let codeText = code

    switch (code){
    case '200':
      codeText = `成功 (${ code })`
      break;
    case '201':
      codeText = `已创建 (${ code })`
      break;
    case '202':
      codeText = `已接受 (${ code })`
      break;
    case '203':
      codeText = `非授权信息 (${ code })`
      break;
    case '204':
      codeText = `成功 (${ code })`
      break;
    case '205':
      codeText = `重置内容 (${ code })`
      break;
    case '206':
      codeText = `部分内容 (${ code })`
      break;
    case '300':
      codeText = `多种选择 (${ code })`
      break;
    case '301':
      codeText = `永久移动 (${ code })`
      break;
    case '302':
      codeText = `临时移动 (${ code })`
      break;
    case '400':
      codeText = `错误请求 (${ code })`
      break;
    case '401':
      codeText = `未授权 (${ code })`
      break;
    case '403':
      codeText = `禁止 (${ code })`
      break;
    case '404':
      codeText = `未找到 (${ code })`
      break;
    case '405':
      codeText = `方法禁用 (${ code })`
      break;
    case '406':
      codeText = `不接受 (${ code })`
      break;
    case '407':
      codeText = `需要代理授权 (${ code })`
      break;
    case '408':
      codeText = `请求超时 (${ code })`
      break;
    case '500':
      codeText = `服务器内部错误 (${ code })`
      break;
    case '501':
      codeText = `尚未实施 (${ code })`
      break;
    case '502':
      codeText = `错误网关 (${ code })`
      break;
    case '503':
      codeText = `服务不可用 (${ code })`
      break;
    case '504':
      codeText = `网关超时 (${ code })`
      break;
    case '505':
      codeText = `HTTP 版本不受支持 (${ code })`
      break;
    default:
      codeText = code
      break;
    }

    return codeText;
  },
  showLoading() {
    $('#loading-underlay').stop().show().fadeIn({// eslint-disable-line
      duration: 100,
      queue:    false,
      easing:   'linear',
      complete: (function() { // eslint-disable-line
        $('#loading-overlay').stop().show().fadeIn({duration: 200, queue: false, easing: 'linear'}); // eslint-disable-line
      })()
    });
  },
  hideLoading() {
    $('#loading-overlay').stop().fadeOut({// eslint-disable-line
      duration: 200,
      queue:    false,
      easing:   'linear',
      complete: (function() { // eslint-disable-line
        $('#loading-underlay').stop().fadeOut({duration: 100, queue: false, easing: 'linear'}); // eslint-disable-line
      })()
    });
  }
});