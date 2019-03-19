import Controller from '@ember/controller';
import { get, set, computed } from '@ember/object';
import { inject as service } from '@ember/service';


export default Controller.extend({
  harbor:                 service(),
  queryParams:            ['page', 'name'],
  page:                   1,
  searchText:             '',
  showAddUserModal:      false,
  modalVisible:          false,
  refreshFlag:           true,
  selectedNodes:         [],
  canChange:             false,
  initiallyOpened:       false,
  headers:                [
    {
      name:           'entity_name',
      label:          '姓名',
      sort:            true,
    },
    {
      name:            'entity_type',
      label:           '成员类型',
      sort:            true,
    },
    {
      name:           'role_name',
      label:          '角色',
      sort:            true,
    },
  ],
  roleArr:      [
    {
      id:   1,
      name: '项目管理员'
    },
    {
      id:   2,
      name: '开发人员'
    },
    {
      id:   3,
      name: '访客'
    }
  ],
  availableActions: [
    {
      action:   'remove',
      icon:     'icon icon-trash',
      label:    'action.remove',
    },
  ],
  actions:     {
    search(val) {
      this.transitionToRoute({ queryParams: { name: val } });
    },
    pageChange(page) {
      this.transitionToRoute({ queryParams: { page } });
    },
    selectChange(selected) {
      let flag = true;

      selected.length ?  flag : flag = false
      selected.forEach( (element) => {
        if (element.entity_name === 'admin'){
          flag = false;
        }
      });
      set(this, 'selectedNodes', selected)
      set(this, 'canChange', flag)
    },
    addUser() {
      set(this, 'showAddUserModal', true);
    },
    refresh() {
      this.send('refreshModel')
    },
    changeRole(roleId) {
      if (!get(this, 'canChange')){
        return;
      }
      get(this, 'harbor').projectChangeRole(get(this, 'model.projectId'), get(this, 'selectedNodes').map((ele) => ele.id), { role_id: roleId }).then(() => {
        set(this, 'model.refreshFlag', false);
        this.send('refreshModel');
      }).catch(() => {
        set(this, 'model.refreshFlag', false);
        this.send('refreshModel');
      });
    },
    deleteMembersRole() {
      if (!get(this, 'canChange')){
        return;
      }
      set(this, 'showConfirmDeleteModal', true)
      set(this, 'model.refreshFlag', false);
    },
    confirmDelete() {
      get(this, 'harbor').projectDeleteMemberRole(get(this, 'model.projectId'), get(this, 'selectedNodes').map((ele) => ele.id)).then(() => {
        set(this, 'showConfirmDeleteModal', false);
        this.transitionToRoute({ queryParams: { page: 1 } });
        this.send('refreshModel');
      }).catch(() => {
        set(this, 'model.refreshFlag', false);
        this.send('refreshModel');
      });
    },
    sortChanged(val) {
      const d = [...get(this, 'model.data')];
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

      set(this, 'model.data', d.sort(compare));
    }
  },
  data: computed( 'model.data', function() {
    const rawData = get(this, 'model.data');

    return rawData;
  }),
});
