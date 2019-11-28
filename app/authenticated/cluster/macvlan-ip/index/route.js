import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';
import { get } from '@ember/object';

export default Route.extend({
  globalStore: service(),
  scope:       service(),
  vlansubnet:  service(),
  prefs:       service(),

  model(params) {
    const clusterId = get(this, 'scope.currentCluster.id');
    const subnet = params.subnet;
    const p = { limit: get(this, 'prefs.tablePerPage') };

    if (subnet) {
      p.labelSelector = encodeURIComponent(`subnet=${ subnet }`);
    }

    return this.vlansubnet.fetchMacvlanIp(clusterId, p).then((resp) => {
      return {
        macvlanIps: {
          data:     resp.body.data,
          continue: resp.body.metadata.continue
        },
      }
    });
  },
  queryParams: { subnet: { refreshModel: true } },
});
