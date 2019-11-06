import Controller from '@ember/controller';
import {
  setProperties, get, set, computed, observer
} from '@ember/object';

export default Controller.extend({
  queryParams:            ['page', 'keyName', 'keyValue'],
  page:                   1,
  searchText:             '',
  selectValue:            'username',
  selectData:             [
    {
      Label:          '用户名',
      value:          'username'
    },
    {
      Label:          '仓库',
      value:          'repository'
    },
    {
      Label:          '标签',
      value:          'tag'
    },
    {
      Label:          '操作',
      value:          'operation'
    },
  ],
  headers:                [
    {
      name:           'username',
      label:          '用户名',
      width:          100,
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
      sort:            true,
      width:          175,
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
      let key = get(this, 'selectValue');
      let object = {
        page:     1,
        keyName:  key,
        keyValue: val
      }

      setProperties(this, object);
    },
    clearSearch(){
      set(this, 'keyValue', '');
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
  keyValueChanged: observer('keyValue', function() {
    set(this, 'searchText', get(this, 'keyValue'));
  }),
  hasHarborServer: computed('model.harborServer', function() {
    return !!get(this, 'model.harborServer');
  } ),
  data: computed( 'model.data', function() {
    const rawData = get(this, 'model.data');

    return rawData;
  }),
});
