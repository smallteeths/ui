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
    const clusterId = get(this, 'scope.currentCluster.id');
    const users = get(this, 'globalStore').findAll('user');
    const pagesize = get(this, 'prefs.tablePerPage');
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

    const logs = this.auditLog.fetchClusterAuditLogs(clusterId, {
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
    set(this, `session.${ C.SESSION.CLUSTER_ROUTE }`, 'authenticated.cluster.audit-log.index');
  }),
});
