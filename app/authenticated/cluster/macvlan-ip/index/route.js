import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';
import { hash } from 'rsvp';

export default Route.extend({
  globalStore: service(),
  scope:       service(),
  vlansubnet:  service(),
  prefs:       service(),

  projects:       null,
  projectOptions: null,
  model(params) {
    const clusterId = this.scope.currentCluster.id;
    const subnet = params.subnet;
    const projectId = params.projectId;
    const p = { limit: this.prefs.tablePerPage, };
    let q = [];
    let  projects = this.globalStore.findAll('project').then((projects) => {
      return projects.filterBy('clusterId', clusterId);
    });

    subnet && q.push(encodeURIComponent(`subnet=${ subnet }`));
    projectId && q.push(encodeURIComponent(`field.cattle.io/projectId=${ projectId }`));
    q.length && (p.labelSelector = q.join(','));

    return hash({
      resp:      this.vlansubnet.fetchMacvlanIp(clusterId, p),
      projects,
    }).then((hash) => {
      const data = hash.resp.body.data;

      data.forEach((item) => {
        item.workloadName = item.workloadId ? item.workloadId.split(`-${ item.namespace }-`)[1] : '';
      });

      let projectOptions = hash.projects.map((project) => {
        return {
          value: project.id.substr(clusterId.length + 1),
          label: project.name
        }
      });

      projectOptions.unshift({
        value: '',
        label: 'All Projects',
        projectOptions,
      });

      return {
        macvlanIps: {
          data,
          continue: hash.resp.body.metadata.continue
        },
        projectOptions,
      };
    });
  },
  queryParams: {
    subnet:    { refreshModel: true },
    projectId: { refreshModel: true }
  },
});
