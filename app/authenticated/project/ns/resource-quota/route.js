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
        const limit = data.body.resourceQuota.limit;
        const hasSetLimit = limit ? !(Object.keys(limit).length === 0) : false;
        const actions = data.body.actionLinks

        return {
          used,
          limit,
          displayName,
          hasSetLimit,
          actions,
        }
      } else {
        return {}
      }
    }).then((data) => {
      if (data.actions && data.actions.getNsQuotaUsage) {
        // The usage is modified to call the namespace action getNsQuotaUsage interface to obtain.
        return get(this, 'globalStore').rawRequest({
          url:    data.actions.getNsQuotaUsage,
          method: 'POST',
          data:   {},
        }).then((resp) => {
          if (resp.body) {
            data.used = resp.body
          }

          return data
        }).catch(() => {
          return data
        })
      }

      return data
    // eslint-disable-next-line newline-per-chained-call
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
