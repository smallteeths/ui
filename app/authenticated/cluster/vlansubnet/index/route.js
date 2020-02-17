import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { get } from '@ember/object';
import { hash } from 'rsvp';

export default Route.extend({
  scope:      service(),
  vlansubnet: service(),
  prefs:      service(),

  model() {
    const clusterId = get(this, 'scope.currentCluster.id');
    const p = { limit: get(this, 'prefs.tablePerPage') };

    const vlansubnets = get(this, 'globalStore').findAll('project').then((projects) => {
      const ids = projects.filterBy('clusterId', get(this, 'scope.currentCluster.id')).map((p) => p.id.replace(/[:]/g, '-')).join(',');

      p.labelSelector = encodeURIComponent(`project in (${ ids },)`);

      return get(this, 'vlansubnet').fetchVlansubnets(clusterId, p).then((resp) => {
        return {
          data: resp.body.data.map((item) => {
            item.displayName = item.name;
            item.macvlanIpCount = (item.rawData && item.rawData.metadata && item.rawData.metadata.annotations && item.rawData.metadata.annotations.macvlanipCount) || 0;

            return item;
          }),
          continue:      resp.body.metadata.continue,
          labelSelector: p.labelSelector,
        };
      }).catch((err) => {
        if (err && err.status === 403) {
          return {
            data:     [],
            errorMsg: err && err.body && err.body.message
          };
        }

        return Promise.reject(err);
      });
    });

    return hash({
      vlansubnets,
      clusterId,
    });
  },
  actions: {
    error(err) {
      // unsupport vlansubnet
      if ( err && err.status ) {
        this.transitionTo('authenticated.cluster.vlansubnet.unsupport', { queryParams: { errorMsg: err && err.body && err.body.message } });

        return false;
      } else {
        // Bubble up
        return true;
      }
    },
    refreshModel() {
      this.refresh();
    }
  },
});
