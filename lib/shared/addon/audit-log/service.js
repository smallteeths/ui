import Service, { inject as service } from '@ember/service';
import { get, computed } from '@ember/object';

export default Service.extend({
  globalStore:    service(),
  access:         service(),
  settings:       service(),
  intl:           service(),
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
    let intl = get(this, 'intl');

    switch (code){
    case '200':
      codeText = `${ intl.t('auditLog.status.200') } (${ code })`
      break;
    case '201':
      codeText = `${ intl.t('auditLog.status.201') } (${ code })`
      break;
    case '202':
      codeText = `${ intl.t('auditLog.status.202') } (${ code })`
      break;
    case '203':
      codeText = `${ intl.t('auditLog.status.203') } (${ code })`
      break;
    case '204':
      codeText = `${ intl.t('auditLog.status.204') } (${ code })`
      break;
    case '205':
      codeText = `${ intl.t('auditLog.status.205') } (${ code })`
      break;
    case '206':
      codeText = `${ intl.t('auditLog.status.206') } (${ code })`
      break;
    case '300':
      codeText = `${ intl.t('auditLog.status.300') } (${ code })`
      break;
    case '301':
      codeText = `${ intl.t('auditLog.status.301') } (${ code })`
      break;
    case '302':
      codeText = `${ intl.t('auditLog.status.302') } (${ code })`
      break;
    case '400':
      codeText = `${ intl.t('auditLog.status.400') } (${ code })`
      break;
    case '401':
      codeText = `${ intl.t('auditLog.status.401') } (${ code })`
      break;
    case '403':
      codeText = `${ intl.t('auditLog.status.403') } (${ code })`
      break;
    case '404':
      codeText = `${ intl.t('auditLog.status.404') } (${ code })`
      break;
    case '405':
      codeText = `${ intl.t('auditLog.status.405') } (${ code })`
      break;
    case '406':
      codeText = `${ intl.t('auditLog.status.406') } (${ code })`
      break;
    case '407':
      codeText = `${ intl.t('auditLog.status.407') } (${ code })`
      break;
    case '408':
      codeText = `${ intl.t('auditLog.status.408') } (${ code })`
      break;
    case '500':
      codeText = `${ intl.t('auditLog.status.500') } (${ code })`
      break;
    case '501':
      codeText = `${ intl.t('auditLog.status.501') } (${ code })`
      break;
    case '502':
      codeText = `${ intl.t('auditLog.status.502') } (${ code })`
      break;
    case '503':
      codeText = `${ intl.t('auditLog.status.503') } (${ code })`
      break;
    case '504':
      codeText = `${ intl.t('auditLog.status.504') } (${ code })`
      break;
    case '505':
      codeText = `${ intl.t('auditLog.status.505') } (${ code })`
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
