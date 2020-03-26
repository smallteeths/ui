import { inject as service } from '@ember/service';
import Controller from '@ember/controller';
import { get, set, computed, observer } from '@ember/object';

export const headers = [
  {
    name:           'username',
    translationKey: 'auditLog.table.user',
    searchField:    'username',
  },
  {
    name:           'operation',
    translationKey: 'auditLog.table.operation',
    searchField:    'operation',
  },
  {
    name:           'responseCode',
    translationKey: 'auditLog.table.result',
    searchField:    'responseCode',
  },
  {
    name:           'requestTimestamp',
    translationKey: 'auditLog.table.time',
    sort:           ['requestTimestamp'],
    searchField:    'requestTimestamp',
  },
  // {
  //   name:           'clusterID',
  //   label:          '集群',
  //   searchField:    'clusterID',
  // },
  {
    name:           'requestResType',
    translationKey: 'auditLog.table.type',
    searchField:    'requestResType',
  },
  {
    name:           'requestResId',
    translationKey: 'auditLog.table.name',
    searchField:    'requestResId',
  },
  {
    name:           'detail',
    translationKey: 'auditLog.table.detail',
    searchField:    'detail',
    classNames:     'text-center',
  },
];

export default Controller.extend({
  auditLog:         service(),
  scope:            service(),
  prefs:            service(),
  router:           service(),
  session:          service(),
  modalService:     service('modal'),
  growl:            service(),
  intl:             service(),
  queryParams:      ['workloadId', 'clusterId'],
  workloadId:       null,
  clusterId:        null,
  tableFlag:        true,
  sortBy:           'requestTimestamp',
  headers,
  data:             [],
  availableActions: [],
  loading:          false,
  form:             {
    field:           'requestResId',
    fieldValue:      '',
    userdisplayname: '',
    next:            '',
    operation:       '',
    operationLabel:  '',
    dateRange:       -1,
    order:           '',
  },
  queryForm: {},

  actions:          {
    showDetail(log) {
      get(this, 'modalService').toggleModal('modal-audit-log-detail', {
        escToClose: true,
        resource:   log
      });
    },
    search() {
      this.syncForm();
      const clusterId = get(this, 'scope.currentCluster.id') || get(this, 'clusterId');
      const q = get(this, 'queryForm');
      const loading = get(this, 'loading');

      if (loading) {
        return
      }
      const projectId = get(this, 'scope.currentProject.id');

      this.auditLog.fetchWorkloadItemAuditLogs(clusterId, projectId, get(this, 'model.workloadId'), q).then((resp) => {
        set(this, 'model.logs.content', resp.body);
        set(this, 'loading', false);
      }).catch((err) => {
        this.messageError(err)
        set(this, 'loading', false);
      });
    },
    clear() {
      this.resetForm();
      this.send('search');
    },
    pageChange(next) {
      if (get(this, 'loading')) {
        return;
      }
      const clusterId = get(this, 'scope.currentCluster.id') || get(this, 'clusterId');
      const projectId = get(this, 'scope.currentProject.id');
      const pagesize = get(this, 'prefs.tablePerPage');
      const param = get(this, 'queryForm');
      const q = Object.assign({
        pagesize,
        next,
      }, param)

      this.auditLog.fetchWorkloadItemAuditLogs(clusterId, projectId, get(this, 'model.workloadId'), q).then((resp) => {
        set(this, 'loading', false);
        const data = [...get(this, 'model.logs.content.data')];

        data.push(...resp.body.data);

        set(this, 'model.logs.content', Object.assign({}, resp.body, { data }));
      }).catch((err) => {
        this.messageError(err)
        set(this, 'loading', false);
      });
    },
    sortChanged(sort) {
      const loading = get(this, 'loading');

      if (loading) {
        return
      }
      set(this, 'loading', true);
      const clusterId = get(this, 'scope.currentCluster.id') || get(this, 'clusterId');
      const projectId = get(this, 'scope.currentProject.id');

      set(this, 'queryForm.order', sort.descending ? 'desc' : 'asc');
      set(this, 'queryForm.pagesize', get(this, 'prefs.tablePerPage'));
      const q = get(this, 'queryForm');

      this.auditLog.fetchWorkloadItemAuditLogs(clusterId, projectId, get(this, 'model.workloadId'), q).then((resp) => {
        set(this, 'model.logs.content', resp.body);
        set(this, 'loading', false);
      }).catch((err) => {
        this.messageError(err)
        set(this, 'loading', false);
      });
    },
  },

  operationsChange: observer('model.selectionResources.resources.[]', function() {
    let resourceTypeObject = null;
    let resourceActions = null;
    const intl = get(this, 'intl');

    get(this, 'model.selectionResources.resources').forEach((item) => {
      if (item.resourceType === 'workload') {
        resourceTypeObject = item
      }
    })
    if (resourceTypeObject) {
      resourceActions = resourceTypeObject.resourceActions.map((item) => {
        return {
          label: item,
          value: item
        }
      })
      resourceActions.unshift({
        label: intl.t('auditLog.form.operation.all'),
        value: ''
      })

      set(this, 'form.operation', '')
      set(this, 'operations', resourceActions)
    }
  }),
  searchFields: computed('intl.locale', function() {
    const intl = get(this, 'intl');

    let arr = [{
      label: intl.t('auditLog.form.name.label'),
      value: 'requestResId'
    }]

    return arr;
  }),
  sourceTypes: computed('intl.locale', 'model.selectionResources.operations', function() {
    const intl = get(this, 'intl');
    let arr = JSON.parse(JSON.stringify(get(this, 'model.selectionResources.operations')));

    arr.unshift({
      label: intl.t('auditLog.form.type.label'),
      value: ''
    });

    return arr;
  }),
  operations: computed('intl.locale', function() {
    const intl = get(this, 'intl');

    let arr = [{
      label: intl.t('auditLog.form.operation.all'),
      value: ''
    },
    {
      label: 'Create',
      value: 'Create'
    },
    {
      label: 'Update',
      value: 'Update'
    },
    {
      label: 'Delete',
      value: 'Delete'
    }]

    return arr;
  }),
  dateRanges: computed('intl.locale', function() {
    const intl = get(this, 'intl');

    let arr = [{
      label: intl.t('auditLog.form.time.all'),
      value: '-1',
    },
    {
      label: intl.t('auditLog.form.time.day5'),
      value: '5',
    },
    {
      label: intl.t('auditLog.form.time.day10'),
      value: '10',
    },
    {
      label: intl.t('auditLog.form.time.day15'),
      value: '15',
    }]

    return arr;
  }),
  rows: computed('model.logs.content.data', function() {
    !get(this, 'model.logs.status') && this.messageError(get(this, 'model.logs.content'))

    return get(this, 'model.logs.status') ? get(this, 'model.logs.content.data').map((d) => {
      return d;
    }) : [];
  }),
  fieldPlaceholder: computed('intl.locale', 'form.field', function() {
    const f = get(this, 'form.field');
    const fields = get(this, 'searchFields');

    return fields.find((item) => item.value === f).label;
  }),
  next: computed('model.logs.content.pagination.next', function() {
    return get(this, 'model.logs.content.pagination.next');
  }),
  users: computed('model.users', function() {
    const users = get(this, 'model.users');

    return users.reduce((total, current) => {
      total[current.id] = current.username;

      return total;
    }, {});
  }),
  messageError(error) {
    const intl = get(this, 'intl');

    if (error.status === 502) {
      get(this, 'growl').fromError(intl.t('auditLog.serverSetError'));
    } else {
      let messageBody = error.body;
      let messageJSON = null;

      if (typeof messageBody === 'string') {
        try {
          messageJSON = JSON.parse(messageBody);
        } catch (e) {}
      }

      let message = messageJSON ? messageJSON.message : messageBody;

      message = message ? message : intl.t('auditLog.unknownError')
      get(this, 'growl').fromError(message);
    }
  },
  syncForm() {
    const f = get(this, 'form');
    const pagesize = get(this, 'prefs.tablePerPage');
    const q = { pagesize };

    if (f.field && f.fieldValue) {
      q[f.field] = f.fieldValue;
    }

    if (f.userdisplayname) {
      q.userdisplayname = f.userdisplayname;
    }

    const dateRange = parseInt(f.dateRange, 10);

    if (dateRange > 0) {
      const d = new Date();

      q.to = `${ d.toISOString().split('.')[0] }Z`;
      d.setDate(d.getDate() - dateRange);
      q.from = `${ d.toISOString().split('.')[0] }Z`
    }
    if (f.operation) {
      q.operation = f.operation;
    }
    if (f.operationLabel) {
      q.requestResType = f.operationLabel;
    }
    set(this, 'queryForm', q);
  },
  resetForm() {
    const pagesize = get(this, 'prefs.tablePerPage');

    set(this, 'queryForm', { pagesize });
    set(this, 'form', {
      field:           'requestResId',
      fieldValue:      '',
      userdisplayname: '',
      next:            '',
      operation:       '',
      operationLabel:  '',
      dateRange:       -1,
      order:           '',
    });
  },
})
