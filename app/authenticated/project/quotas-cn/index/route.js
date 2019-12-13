import { get, set } from '@ember/object';
import { hash } from 'rsvp';
import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';
import { on } from '@ember/object/evented';
import C from 'ui/utils/constants';

export default Route.extend({
  globalStore:         service(),
  scope:               service(),
  clusterStore: service(),

  model() {
    const appRoute = window.l('route:application');
    const project = appRoute.modelFor('authenticated.project').get('project');
    const clusterId = project.get('clusterId');
    const projectId = project.get('id');
    const quotaSetting = get(this, 'globalStore').rawRequest({ url: `/v3/projects/${ projectId }` }).then((data) => {
      if (data.body && data.body.annotations && data.body.resourceQuota) {
        let used = {};

        if (data.body.annotations['field.cattle.io/resourceQuotaUsage'] && this.isJson(data.body.annotations['field.cattle.io/resourceQuotaUsage'])) {
          used = JSON.parse(data.body.annotations['field.cattle.io/resourceQuotaUsage']);
        }
        const limit = data.body.resourceQuota.limit;
        const hasSetLimit = limit ? !(Object.keys(limit).length === 0) : false;

        return {
          used,
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


    return hash(
      {
        project,
        quotaSetting,
        clusterId,
        namespaces: store.findAll('namespace'),
        users:      get(this, 'globalStore').findAll('user'),
      }
    );
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
