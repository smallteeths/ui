import Controller from '@ember/controller';
import { observer, get, set, computed } from '@ember/object';

export default Controller.extend({
  queryParams:            ['page', 'name'],
  page:                   1,
  searchText:             '',
  headers:                [
    {
      name:           'username',
      label:          '用户名',
      width:           100,
      sort:            true,
    },
    {
      name:            'repo_name',
      label:           '镜像名称',
      sort:            true,
    },
    {
      name:           'repo_tag',
      label:          '标签',
      sort:            true,
    },
    {
      name:           'operation',
      label:           '操作',
      sort:            true,
    },
    {
      name:           'op_time',
      label:           '时间戳',
      width:           175,
      sort:            true,
    },
  ],
  availableActions: [
    {
      action:   'remove',
      icon:     'icon icon-trash',
      label:    'action.remove',
    },
  ],
  actions:     {
    pageChange(page) {
      set(this, 'page', page);
    },
    search(val) {
      set(this, 'name', val);
    },
    clearSearch() {
      set(this, 'name', '');
    },
    sortChanged(val) {
      const d = [...get(this, 'model.logList.data')];
      let compare = function(obj1, obj2) {
        let a = obj1[val.sortBy];
        let b = obj2[val.sortBy];

        if ( a < b ) {
          return val.descending ? 1 : -1;
        } else if (a > b) {
          return val.descending ? -1 : 1;
        } else {
          return 0;
        }
      }

      set(this, 'model.logList.data', d.sort(compare));
    }
  },
  nameChanged: observer('name', function() {
    set(this, 'searchText', get(this, 'name'));
  }),
  isSystemAdmin: computed('model.currentUser', function() {
    return get(this, 'model.currentUser.has_admin_role');
  }),
  isProjectAdmin: computed('isSystemAdmin', 'model.currentUserRoleId', function() {
    if (get(this, 'isSystemAdmin')) {
      return true;
    } else {
      return get(this, 'model.currentUserRoleId') === '1';
    }
  }),
  isMember: computed('isSystemAdmin', 'model.currentUserRoleId', function() {
    if (get(this, 'isSystemAdmin')) {
      return true;
    } else {
      return parseInt(get(this, 'model.currentUserRoleId'), 10) > 0;
    }
  }),
  data: computed( 'model.logList.data', function() {
    const rawData = get(this, 'model.logList.data');

    return rawData;
  }),
});
