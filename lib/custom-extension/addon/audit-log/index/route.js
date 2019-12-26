import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';
import { get, set } from '@ember/object';

export default Route.extend({
  scope:       service(),
  auditLog:    service(),
  prefs:       service(),
  globalStore: service(),
  intl:        service(),
  model() {
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
    const logs = this.auditLog.fetchRancherAuditLogs({ pagesize }).then((resp) => {
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
