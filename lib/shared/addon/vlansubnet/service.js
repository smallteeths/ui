
import Service, { inject as service } from '@ember/service';
import { get } from '@ember/object';

export default Service.extend({
  globalStore:    service(),
  access:         service(),
  fetchVlansubnets(cluster, p = {}) {
    const q = Object.entries(p).map((e) => `${ e[0] }=${ e[1] }`).join('&');
    const projectsP = get(this, 'globalStore').findAll('project');
    const vlansubnetsP =  get(this, 'globalStore').rawRequest({
      url:    `/k8s/clusters/${ cluster }/apis/macvlan.cluster.cattle.io/v1/namespaces/kube-system/macvlansubnets${ q ? `?${ q }` : '' }`,
      method: 'GET',
    });

    return Promise.all([projectsP, vlansubnetsP]).then(([projects, vlansubnets]) => {
      vlansubnets.body.data = vlansubnets.body.items.map((item) => {
        const project = item.metadata.labels && item.metadata.labels.project && projects.findBy('id', item.metadata.labels.project.replace('-p-', ':p-'));

        return {
          id:                item.metadata.uid,
          name:              item.metadata.name,
          displayName:       item.metadata.name,
          project:           project && project.name,
          master:            item.spec.master,
          vlan:              item.spec.vlan,
          cidr:              item.spec.cidr,
          mode:              item.spec.mode,
          gateway:           item.spec.gateway,
          creationTimestamp: item.metadata.creationTimestamp,
          ipRanges:          item.spec.ranges.map((item) => `${ item.rangeStart }-${ item.rangeEnd }`).join(', '),
          routes:            (item.spec.routes || []).map((item) => `DST:${ item.dst }${ item.gw ? ` GW:${ item.gw }` : '' }${ item.iface ? ` Iface:${ item.iface }` : '' }`).join(', '),
          rawData:           item,
        };
      });

      return vlansubnets;
    });
  },
  removeVlansubnets(cluster, subnet) {
    return get(this, 'globalStore').rawRequest({
      url:    `/k8s/clusters/${ cluster }/apis/macvlan.cluster.cattle.io/v1/namespaces/kube-system/macvlansubnets/${ subnet }`,
      method: 'DELETE',
    });
  },
  createVlansubnets(cluster, params) {
    return get(this, 'globalStore').rawRequest({
      url:    `/k8s/clusters/${ cluster }/apis/macvlan.cluster.cattle.io/v1/namespaces/kube-system/macvlansubnets`,
      method: 'POST',
      data:   params,
    });
  },
  fetchMacvlanIp(cluster, p = {}) {
    const q = Object.entries(p).map((item) => `${ item[0] }=${ item[1] }`).join('&');

    return get(this, 'globalStore').rawRequest({
      url:    `/k8s/clusters/${ cluster }/apis/macvlan.cluster.cattle.io/v1/macvlanips${ q ? `?${ q }` : '' }`,
      method: 'GET',
    }).then((resp) => {
      resp.body.data = resp.body.items.map((d) => {
        return {
          creationTimestamp: d.metadata.creationTimestamp,
          name:              d.metadata.name,
          displayName:       d.metadata.name,
          namespace:         d.metadata.namespace,
          id:                d.metadata.uid,
          projectId:         d.metadata.labels['field.cattle.io/projectId'],
          workloadselector:  d.metadata.labels['workload.user.cattle.io/workloadselector'],
          workloadName:      this.getWorkloadName(d.metadata.name, d.metadata.labels['workload.user.cattle.io/workloadselector']),
          cidr:              d.spec.cidr,
          mac:               d.spec.mac,
          podId:             d.spec.podId,
          subnet:            d.spec.subnet,
        };
      });

      return resp;
    });
  },
  fetchVlansubnet(cluster, name) {
    return get(this, 'globalStore').rawRequest({
      url:    `/k8s/clusters/${ cluster }/apis/macvlan.cluster.cattle.io/v1/namespaces/kube-system/macvlansubnets/${ name }`,
      method: 'GET',
    });
  },
  updateVlansubnet(cluster, name, data) {
    return get(this, 'globalStore').rawRequest({
      url:    `/k8s/clusters/${ cluster }/apis/macvlan.cluster.cattle.io/v1/namespaces/kube-system/macvlansubnets/${ name }`,
      method: 'PUT',
      data,
    });
  },
  fetchPods(cluster, name){
    return get(this, 'globalStore').rawRequest({
      url:    `/k8s/clusters/${ cluster }/api/v1/pods?&limit=201&labelSelector=macvlan.pandaria.cattle.io/subnet%3D${ name }`,
      method: 'GET',
    });
  },
  getWorkloadName(name, workloadselector){
    const nameArr = name.split('-');
    const workloadselectorArr = workloadselector.split('-');
    let workloadArr = []
    let workloadArrName = []
    let workloadArrSelect = []

    for (let i = 0; i < workloadselectorArr.length; i++){
      if (nameArr[i] === undefined){
        return workloadArr.length ? workloadArr.join('-') : '';
      }
      workloadArrName.push(nameArr[i]);
      workloadArrSelect.unshift(workloadselectorArr[workloadselectorArr.length - i - 1]);

      if (workloadArrName.join('-') === workloadArrSelect.join('-')){
        workloadArr = JSON.parse(JSON.stringify(workloadArrName));
      }
    }

    return workloadArr.length ? workloadArr.join('-') : '';
  }
});
