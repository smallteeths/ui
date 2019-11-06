import Controller from '@ember/controller';
import { get, set, computed, observer } from '@ember/object';
import { inject as service } from '@ember/service';

export default Controller.extend({
  harbor:                 service(),
  access:                 service(),
  queryParams:            ['page', 'name'],
  page:                   1,
  searchText:             '',
  name:                   '',
  showConfirmDeleteModal: false,
  selectedRepos:          [],
  headers:                [
    {
      name:           'name',
      label:          '名称',
      sort:            true,
    },
    {
      name:            'tags_count',
      label:           '标签数',
      sort:            true,
    },
    {
      name:           'pull_count',
      label:           '下载数',
      sort:            true,
    },
  ],
  availableActions: [
    {
      action:   'remove',
      icon:     'icon icon-trash',
      label:    'action.remove',
      active(selectedRows) {
        if (!selectedRows.length) {
          return false;
        }

        return get(this, 'model.currentUser.has_admin_role') || get(this, 'model.currentUserRoleId') === '1';
      }
    },
  ],
  actions:     {
    handleCommand(command, data) {
      switch (command) {
      case 'remove':
        this.send('promptDelete', [data])
        break;
      }
    },
    pageChange(page) {
      set(this, 'page', page)
    },
    search(val) {
      set(this, 'name', val)
    },
    clearSearch() {
      set(this, 'name', '');
    },
    promptDelete(projects) {
      set(this, 'showConfirmDeleteModal', true)
      set(this, 'selectedRepos', projects);
    },
    confirmDelete() {
      const repos = get(this, 'selectedRepos');

      if (repos && repos.length > 0) {
        get(this, 'harbor').deleteRepos(repos.map((p) => p.name)).then(() => {
          set(this, 'selectedRepos', null);
          set(this, 'showConfirmDeleteModal', false);
          this.send('refreshModel');
        }).catch((err) => {
          set(this, 'selectedRepos', null);
          set(this, 'showConfirmDeleteModal', false);
          this.send('refreshModel');
          this.growl.fromError('删除失败', err.body)
        });
      }
    },
    sortChanged(val) {
      const d = [...get(this, 'model.imageList.data')];
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

      set(this, 'model.imageList.data', d.sort(compare));
    }
  },
  nameChanged: observer('name', function() {
    set(this, 'searchText', get(this, 'name'));
  }),
  isAdmin: computed('access.currentUser.hasAdmin', 'model.currentUserRoleId', function() {
    return !!get(this, 'access.currentUser.hasAdmin') || get(this, 'model.currentUserRoleId') === '1';
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
  data: computed( 'model.imageList.data', function() {
    const rawData = get(this, 'model.imageList.data');

    return rawData;
  }),
});
