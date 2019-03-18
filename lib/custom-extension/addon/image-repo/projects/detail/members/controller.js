import Controller from '@ember/controller';
import { get, set } from '@ember/object';
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
    },
    {
      name:            'entity_type',
      label:           '成员类型',
    },
    {
      name:           'role_name',
      label:          '角色',
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
    }
  }
});
