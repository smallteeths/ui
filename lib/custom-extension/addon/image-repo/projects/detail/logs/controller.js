import Controller from '@ember/controller';
import { get, set, computed } from '@ember/object';

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
      classNames:     'text-right pr-20',
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
      this.transitionToRoute({ queryParams: { page } });
    },
    search(val) {
      this.transitionToRoute({ queryParams: { name: val } });
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
