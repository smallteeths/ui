import Controller from '@ember/controller';
import { get, set, computed, observer } from '@ember/object';
import { inject as service } from '@ember/service';

export default Controller.extend({
  harbor:                 service(),
  growl:                  service(),
  intl:                   service(),
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
      name:           'name',
      translationKey: 'harborConfig.table.projectName',
      sort:           true,
    },
    {
      name:           'metadata.public',
      translationKey: 'harborConfig.table.level',
      sort:           true,
    },
    {
      name:           'current_user_role_id',
      translationKey: 'harborConfig.table.role',
      sort:           true,
    },
    {
      name:           'repo_count',
      translationKey: 'harborConfig.table.count',
      sort:           true,
    },
    {
      name:           'creation_time',
      translationKey: 'generic.created',
      width:          175,
      sort:           true,
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
  selectData: computed('intl.locale', function() {
    const intl = get(this, 'intl');
    let arr = [{
      value: '',
      label: intl.t('harborConfig.form.image.all')
    },
    {
      value: '1',
      label: intl.t('harborConfig.form.image.public'),
    },
    {
      value: '0',
      label: intl.t('harborConfig.form.image.private'),
    }
    ]

    return arr;
  }),
  hasHarborServer: computed('model.harborServer', function() {
    return !!get(this, 'model.harborServer');
  }),
  data: computed( 'model.projects.data', function() {
    const rawData = get(this, 'model.projects.data');

    return rawData;
  }),
});
