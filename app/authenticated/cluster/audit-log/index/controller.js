import { inject as service } from '@ember/service';
import Controller from '@ember/controller';
import { get, set, computed } from '@ember/object';

export const headers = [
  {
    name:           'username',
    label:          '操作人',
    searchField:    'username',
  },
  {
    name:           'operation',
    label:          '操作',
    searchField:    'operation',
  },
  {
    name:           'responseCode',
    label:          '操作结果',
    searchField:    'responseCode',
  },
  {
    name:           'requestTimestamp',
    label:          '变更时间',
    sort:           ['requestTimestamp'],
    searchField: 'requestTimestamp',
  },
  // {
  //   name:           'clusterID',
  //   label:          '集群',
  //   searchField:    'clusterID',
  // },
  {
    name:           'requestResType',
    label:          '资源类型',
    searchField:    'requestResType',
  },
  {
    name:           'requestResId',
    label:          '资源Name/ID',
    searchField:    'requestResId',
  },
  {
    name:           'detail',
    label:          '详情',
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
  sortBy:           'requestTimestamp',
  dateRanges:       [
    {
      label: '日志时间-全部',
      value: '-1',
    },
    {
      label: '最近5天',
      value: '5',
    },
    {
      label: '最近10天',
      value: '10',
    },
    {
      label: '最近15天',
      value: '15',
    }
  ],
  operations: [
    {
      label: '所有操作',
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
    }
  ],
  searchFields: [
    {
      label: '请求资源Name/ID',
      value: 'requestResId',
    },
  ],
  headers,
  data:             [],
  availableActions: [],
  loading:          false,
  form:             {
    field:          'requestResId',
    fieldValue:     '',
    next:           '',
    operation:      '',
    operationLabel: '',
    dateRange:      -1,
    order:          '',
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
      const clusterId = get(this, 'scope.currentCluster.id');
      const q = get(this, 'queryForm');

      const loading = get(this, 'loading');

      if (loading) {
        return
      }
      this.auditLog.fetchClusterAuditLogs(clusterId, q).then((resp) => {
        set(this, 'model.logs.content', resp.body);
        set(this, 'loading', false);
      }).catch((err) => {
        this.messageError(err)
        set(this, 'loading', false);
      });
    },
    operationsChanged() {
      let resourceTypeObject = null;
      let resourceActions = null;

      if (!get(this, 'form.operationLabel')) {
        resourceActions = [
          {
            label: '所有操作',
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
          }
        ]
      } else {
        get(this, 'model.selectionResources.resources').forEach((item) => {
          if (item.resourceType === get(this, 'form.operationLabel')) {
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
            label: '所有操作',
            value: ''
          })
        }
      }

      set(this, 'form.operation', '')
      set(this, 'operations', resourceActions)
    },
    clear() {
      this.resetForm();
      this.send('search');
    },
    pageChange(next) {
      if (get(this, 'loading')) {
        return;
      }
      const clusterId = get(this, 'scope.currentCluster.id');
      const pagesize = get(this, 'prefs.tablePerPage');
      const param = get(this, 'queryForm');
      const q = Object.assign({
        pagesize,
        next,
      }, param)

      this.auditLog.fetchClusterAuditLogs(clusterId, q).then((resp) => {
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
      const clusterId = get(this, 'scope.currentCluster.id');

      set(this, 'queryForm.order', sort.descending ? 'desc' : 'asc');
      set(this, 'queryForm.pagesize', get(this, 'prefs.tablePerPage'));
      const q = get(this, 'queryForm');

      this.auditLog.fetchClusterAuditLogs(clusterId, q).then((resp) => {
        set(this, 'model.logs.content', resp.body);
        set(this, 'loading', false);
      }).catch((err) => {
        this.messageError(err)
        set(this, 'loading', false);
      });
    },
  },
  rows: computed('model.logs.content.data', function() {
    !get(this, 'model.logs.status') && this.messageError(get(this, 'model.logs.content'))

    return get(this, 'model.logs.status') ? get(this, 'model.logs.content.data').map((d) => {
      return d;
    }) : [];
  }),
  fieldPlaceholder: computed('form.field', function() {
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
    if (error.status === 502) {
      get(this, 'growl').fromError('请检查auditlog-server-url服务配置是否正确');
    } else {
      let messageBody = error.body;
      let messageJSON = null;

      if (typeof messageBody === 'string') {
        try {
          messageJSON = JSON.parse(messageBody);
        } catch (e) {}
      }

      let message = messageJSON ? messageJSON.message : messageBody;

      message = message ? message : '未知错误'
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
      field:          'requestResId',
      fieldValue:     '',
      next:           '',
      operation:      '',
      operationLabel: '',
      dateRange:      -1,
      order:          '',
    });
  },
})
