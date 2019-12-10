import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';
import { get, set } from '@ember/object';

export default Route.extend({
  scope:       service(),
  auditLog:    service(),
  prefs:       service(),
  globalStore: service(),
  model(params) {
    const appRoute = window.l('route:application');
    const project = appRoute.modelFor('authenticated.project').get('project');
    const projectId = project.get('id');
    const clusterId = project.get('clusterId');
    const workloadId = params.workloadId
    const pagesize = get(this, 'prefs.tablePerPage');
    const users = get(this, 'globalStore').findAll('user');
    let operations = [];
    let resources = [];
    const selectionResources = this.auditLog.fetchRancherAuditResources().then((resp) => {
      if (resp.body.data) {
        resp.body.data.forEach((item) => {
          if (item.resourceType === 'workload') {
            operations.push({
              value: item.resourceType,
              label: item.resourceType,
            })
          }
        })
        operations.unshift({
          label: '所有类型',
          value: ''
        })
        resources = resp.body.data;
      }

      return {
        operations,
        resources
      };
    }).catch(() => {
      return {
        operations,
        resources
      };
    });

    const logs = this.auditLog.fetchWorkloadItemAuditLogs(clusterId, projectId, workloadId, { pagesize }).then((resp) => {
      return {
        status:    true,
        content:   resp.body,
      };
    }).catch((err) => {
      return {
        status:    false,
        content:   err,
      };
    });


    return hash({
      logs,
      users,
      selectionResources,
      workloadId,
    });
  },

  resetController(controller, isExisting) {
    if (isExisting) {
      const pagesize = get(this, 'prefs.tablePerPage');

      set(this, 'queryForm', { pagesize });
      set(controller, 'form', {
        field:          'requestResId',
        fieldValue:     '',
        next:           '',
        operation:      '',
        operationLabel: '',
        dateRange:      -1,
        order:          '',
      });
    }
  },

  actions: {
    refreshModel() {
      this.refresh();
    }
  },
});
