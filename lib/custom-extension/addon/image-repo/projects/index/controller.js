import Controller from '@ember/controller';
import { get, set, computed } from '@ember/object';
import { inject as service } from '@ember/service';

export default Controller.extend({
  harbor:                 service(),
  growl:                    service(),
  queryParams:            ['page', 'name', 'isPublic'],
  page:                   1,
  name:                   '',
  hasSelect:              true,
  showConfirmDeleteModal: false,
  showAddProjectModal:    false,
  firstInit:              true,
  selectedProjects:       [],
  headers:                [
    {
      name:            'name',
      label:           '项目名称',
      width:           100,
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
      label:   '所有项目'
    },
    {
      value:   '1',
      label:   '公开'
    },
    {
      value:   '0',
      label:   '不公开'
    }
  ],
  availableActions: [
    {
      action:   'remove',
      icon:     'icon icon-trash',
      label:    'action.remove',
    },
  ],
  init() {
    this._super(...arguments);
    set(this, 'firstInit', true);
  },
  actions:     {
    pageChange(page) {
      this.transitionToRoute({ queryParams: { page } });
    },
    refresh() {
      this.send('refreshModel');
    },
    addNewProject() {
      set(this, 'showAddProjectModal', true);
    },
    search(text) {
      this.transitionToRoute({ queryParams: { name: text } });
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
    },
    selectChange(val) {
      if (typeof val === 'string'){
        this.transitionToRoute({ queryParams: { isPublic: val } });
      }
    }
  },
  hasHarborServer: computed('model.harborServer', function() {
    return !!get(this, 'model.harborServer');
  }),
  data: computed( 'model.data', function() {
    const rawData = get(this, 'model.data');

    return rawData;
  }),
});