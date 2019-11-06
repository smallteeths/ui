import Controller from '@ember/controller';
import { get, set, computed, observer } from '@ember/object';
import { inject as service } from '@ember/service';

export default Controller.extend({
  harbor:                 service(),
  growl:                    service(),
  queryParams:            ['page', 'name', 'isPublic'],
  page:                   1,
  name:                   '',
  isPublic:               '',
  searchText:             '',
  hasSelect:              true,
  showConfirmDeleteModal: false,
  showAddProjectModal:    false,
  firstInit:              true,
  selectedProjects:       [],
  headers:                [
    {
      name:            'name',
      label:           '仓库项目名称',
      sort:            true,
    },
    {
      name:            'metadata.public',
      label:           '访问级别',
      sort:             true,
    },
    {
      name:            'current_user_role_id',
      label:           '角色',
      sort:            true,
    },
    {
      name:            'repo_count',
      label:           '镜像仓库数',
      sort:            true,
    },
    {
      name:            'creation_time',
      label:           '创建时间',
      width:           175,
      sort:            true,
    },
  ],
  selectData:       [
    {
      value:   '',
      label:   '所有仓库项目'
    },
    {
      value:   '1',
      label:   '公开项目'
    },
    {
      value:   '0',
      label:   '私有项目'
    }
  ],
  availableActions: [
    {
      action:         'remove',
      icon:           'icon icon-trash',
      label:          'action.remove',
      active(selectedRows) {
        if (!selectedRows.length) {
          return false;
        }

        return get(this, 'model.currentUser.has_admin_role') || selectedRows.every((pro) => `${ pro.current_user_role_id }` === '1');
      },
    },
  ],
  init() {
    this._super(...arguments);
    set(this, 'firstInit', true);
  },
  actions:     {
    handleCommand(command, data) {
      switch (command) {
      case 'remove':
        this.send('promptDelete', [data]);
        break;
      }
    },
    pageChange(page) {
      set(this, 'page', page);
    },
    refresh() {
      this.send('refreshModel');
    },
    addNewProject() {
      set(this, 'showAddProjectModal', true);
    },
    search(text) {
      set(this, 'name', text);
    },
    promptDelete(projects) {
      set(this, 'showConfirmDeleteModal', true)
      set(this, 'selectedProjects', projects);
    },
    confirmDelete() {
      const projects = get(this, 'selectedProjects');

      if (projects && projects.length > 0) {
        get(this, 'harbor').removeProjects(projects.map((p) => p.project_id)).then(() => {
          set(this, 'selectedProjects', null);
          set(this, 'showConfirmDeleteModal', false);
          this.send('refreshModel');
        }).catch((err) => {
          set(this, 'selectedProjects', null);
          set(this, 'showConfirmDeleteModal', false);
          this.send('refreshModel');
          this.growl.fromError('删除失败', err.body)
        });
      }
    },
    sortChanged(val) {
      const d = [...get(this, 'model.projects.data')];
      let compare = function(obj1, obj2) {
        let a = obj1[val.sortBy];
        let b = obj2[val.sortBy];

        if (val.sortBy === 'metadata.public'){
          a = obj1[ 'metadata' ][ 'public' ]
          b = obj2[ 'metadata' ][ 'public' ]
        }
        if ( a < b ) {
          return val.descending ? 1 : -1;
        } else if (a > b) {
          return val.descending ? -1 : 1;
        } else {
          return 0;
        }
      }

      set(this, 'model.projects.data', d.sort(compare));
    },
    // selectChange(val) {
    //   set(this, 'isPublic', val);
    // }
  },
  nameChanged: observer('name', function() {
    set(this, 'searchText', get(this, 'name'));
  }),
  hasHarborServer: computed('model.harborServer', function() {
    return !!get(this, 'model.harborServer');
  }),
  data: computed( 'model.projects.data', function() {
    const rawData = get(this, 'model.projects.data');

    return rawData;
  }),
});