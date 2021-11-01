import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';
import { get, set } from '@ember/object';
import { on } from '@ember/object/evented';
import C from 'ui/utils/constants';

const DEFAULT_DATE_RANGE = '5';

export default Route.extend({
  scope:       service(),
  auditLog:    service(),
  prefs:       service(),
  globalStore: service(),
  intl:        service(),

  model() {
    const appRoute = window.l('route:application');
    const project = appRoute.modelFor('authenticated.project').get('project');
    const projectId = project.get('id');
    const clusterId = project.get('clusterId');
    const pagesize = get(this, 'prefs.tablePerPage');
    const users = get(this, 'globalStore').findAll('user');
    let operations = [];
    let resources = [];
    const selectionResources = this.auditLog.fetchRancherAuditResources().then((resp) => {
      if (resp.body.data) {
        operations = resp.body.data.map((item) => {
          return {
            value: item.resourceType,
            label: item.resourceType,
          }
        });
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
    const d = new Date();
    const to = `${ d.toISOString().split('.')[0] }Z`;

    d.setDate(d.getDate() - DEFAULT_DATE_RANGE);
    const from = `${ d.toISOString().split('.')[0] }Z`;

    const logs = this.auditLog.fetchWorkloadAuditLogs(clusterId, projectId, {
      from,
      to,
      pagesize
    }).then((resp) => {
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
        dateRange:      DEFAULT_DATE_RANGE,
        order:          '',
      });
    }
  },

  actions: {
    refreshModel() {
      this.refresh();
    }
  },

  setDefaultRoute: on('activate', function() {
    set(this, `session.${ C.SESSION.PROJECT_ROUTE }`, 'authenticated.project.audit-log.index');
  }),
});
