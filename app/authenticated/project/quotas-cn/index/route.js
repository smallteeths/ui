import { get, set } from '@ember/object';
import { hash } from 'rsvp';
import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';
import { on } from '@ember/object/evented';
import C from 'ui/utils/constants';

const resourceQuotaUsageProjectID = 'field.cattle.io/resourceQuotaUsageProjectID'

export default Route.extend({
  globalStore:         service(),
  scope:               service(),
  clusterStore: service(),

  model() {
    const appRoute = window.l('route:application');
    const project = appRoute.modelFor('authenticated.project').get('project');
    const clusterId = project.get('clusterId');
    const projectId = project.get('id');
    const parojectQuotaUsage = get(this, 'globalStore').rawRequest({ url: `/v3/projectresourcequotausages` }).then((res) => {
      let usage = {};

      if (res.body && res.body.data && res.body.data.length > 0) {
        usage = res.body.data.find((item) => item && item.annotations && item.annotations[resourceQuotaUsageProjectID] === projectId) || {};
      }

      return usage.status ? usage.status : {};
    }).catch(() => {
      return {}
    })
    const quotaSetting = get(this, 'globalStore').rawRequest({ url: `/v3/projects/${ projectId }` }).then((data) => {
      if (data.body && data.body.annotations && data.body.resourceQuota) {
        const limit = data.body.resourceQuota.limit;
        const hasSetLimit = limit ? !(Object.keys(limit).length === 0) : false;

        return {
          limit,
          hasSetLimit,
        }
      } else {
        return {}
      }
    }).catch(() => {
      return {}
    })
    const store = this.get('clusterStore');


    return hash({
      project,
      quotaSetting,
      clusterId,
      namespaces: store.findAll('namespace'),
      users:      get(this, 'globalStore').findAll('user'),
      parojectQuotaUsage,
    }).then((hash) => {
      set(hash, 'quotaSetting.used', hash.parojectQuotaUsage);

      return hash;
    });
  },

  actions: {
    refreshModel() {
      this.refresh();
    }
  },

  setDefaultRoute: on('activate', function() {
    set(this, `session.${ C.SESSION.PROJECT_ROUTE }`, 'authenticated.project.quotas-cn');
  }),

  isJson(str) {
    try {
      let obj = JSON.parse(str);

      if (typeof obj === 'object' && obj ){
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  },
});
