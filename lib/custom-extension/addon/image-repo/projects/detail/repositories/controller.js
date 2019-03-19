import Controller from '@ember/controller';
import { get, set, computed } from '@ember/object';
import { inject as service } from '@ember/service';

export default Controller.extend({
  harbor:                 service(),
  access:                 service(),
  queryParams:            ['page', 'name'],
  page:                   1,
  searchText:             '',
  showConfirmDeleteModal: false,
  selectedImage:          [],
  headers:                [
    {
      name:           'name',
      label:          '名称',
      sort:            true,
    },
    {
      name:            'repo_name',
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
    },
  ],
  actions:     {
    pageChange(page) {
      this.transitionToRoute({ queryParams: { page } });
    },
    search(val) {
      this.transitionToRoute({ queryParams: { name: val } });
    },
    promptDelete(projects) {
      set(this, 'showConfirmDeleteModal', true)
      set(this, 'selectedImage', projects);
    },
    confirmDelete() {
      const images = get(this, 'selectedImage');

      if (images && images.length > 0) {
        get(this, 'harbor').deleteMirror(images.map((p) => p.name)).then(() => {
          set(this, 'selectedImage', null);
          set(this, 'showConfirmDeleteModal', false);
          this.send('refreshModel');
        }).catch((err) => {
          set(this, 'selectedImage', null);
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
  isAdmin: computed('access.admin', function() {
    return !!get(this, 'access.admin');
  }),
  data: computed( 'model.imageList.data', function() {
    const rawData = get(this, 'model.imageList.data');

    return rawData;
  }),
});
