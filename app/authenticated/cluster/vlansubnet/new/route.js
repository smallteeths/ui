import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';
import { hash } from 'rsvp'

export default Route.extend({
  scope:       service(),
  vlansubnet:  service(),
  model(params = {}) {
    const clusterId = get(this, 'scope.currentCluster.id');
    const { copy_id } = params
    let form = {};
    const projects = get(this, 'globalStore').findAll('project');
    const namespaces = get(this, 'clusterStore').findAll('namespace');

    if ( copy_id ){
      form = get(this, 'vlansubnet').fetchVlansubnet(clusterId, copy_id).then((resp) => {
        let { metadata, spec } = resp.body || {};
        const cloneForm = {
          apiVersion: 'macvlan.cluster.cattle.io/v1',
          kind:       'MacvlanSubnet',
          metadata:   {
            name:      '',
            namespace: 'kube-system',
            labels:    { project: metadata && metadata.labels && metadata.labels.project || '' },
          },
          spec: {
            master:            spec && spec.master || '',
            vlan:              spec && spec.vlan || '',
            cidr:              spec && spec.cidr || '',
            mode:              spec && spec.mode || 'bridge',
            gateway:           spec && spec.gateway || '',
            ranges:            [],
            routes:            spec && spec.routes || [],
            podDefaultGateway: {
              enable:      spec && spec.podDefaultGateway && spec.podDefaultGateway.enable || false,
              serviceCidr: spec && spec.podDefaultGateway && spec.podDefaultGateway.serviceCidr || ''
            }
          }
        };

        return cloneForm;
      });
    } else {
      let emptyForm = {
        apiVersion: 'macvlan.cluster.cattle.io/v1',
        kind:       'MacvlanSubnet',
        metadata:   {
          name:      '',
          namespace: 'kube-system',
          labels:    { project: '' },
        },
        spec: {
          master:            '',
          vlan:              '',
          cidr:              '',
          mode:              'bridge',
          gateway:           '',
          ranges:            [],
          routes:            [],
          podDefaultGateway: {
            enable:      false,
            serviceCidr: ''
          }
        }
      };

      form = emptyForm;
    }

    return hash({
      clusterId,
      projects,
      namespaces,
      form
    });
  },
  setupController(controller) {
    set(controller, 'ipRangesExisted', null);
    this._super(...arguments);
  },

  queryParams: {
    copy_id: {
      refreshModel: true,
      replace:      true
    }
  },
});
