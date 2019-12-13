import { get } from '@ember/object';
import { hash } from 'rsvp';
import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';

export default Route.extend({
  globalStore:         service(),
  scope:               service(),
  clusterStore:        service(),

  model(params) {
    const name = get(params, 'ns')
    const appRoute = window.l('route:application');
    const project = appRoute.modelFor('authenticated.project').get('project');
    const cluster = project.get('clusterId');
    const displayName = get(this, 'scope.currentCluster.displayName');
    const quotaSetting = get(this, 'globalStore').rawRequest({ url: `/v3/cluster/${ cluster }/namespaces/${ name }` }).then((data) => {
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
          displayName,
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
        quotaSetting,
        namespaces: store.findAll('namespace'),
        name,
      }
    );
  },

  actions: {
    refreshModel() {
      this.refresh();
    }
  },

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
