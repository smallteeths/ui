import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';
import { hash } from 'rsvp'

export default Route.extend({
  scope:        service(),
  vlansubnet:   service(),
  model(params) {
    const clusterId = get(this, 'scope.currentCluster.id');
    const { macvlan_name } = params;
    const projects = get(this, 'globalStore').findAll('project');
    const namespaces = get(this, 'clusterStore').findAll('namespace');
    const vlansubnet = get(this, 'vlansubnet').fetchVlansubnet(clusterId, macvlan_name).then((resp) => resp.body);

    return hash({
      clusterId,
      vlansubnet,
      projects,
      namespaces,
    });
  },
  setupController(controller, model) {
    const form = JSON.parse(JSON.stringify(model.vlansubnet));

    form.spec.ranges = [];
    form.spec.podDefaultGateway = form.spec.podDefaultGateway || {}
    form.spec.podDefaultGateway.enable = !!form.spec.podDefaultGateway.enable;
    form.spec.routes = model.vlansubnet.spec.routes ? JSON.parse(JSON.stringify(model.vlansubnet.spec.routes)) : [];
    set(controller, 'form', form);
    set(controller, 'ipRangesExisted', null);
    this._super(controller, model);
  }
});
