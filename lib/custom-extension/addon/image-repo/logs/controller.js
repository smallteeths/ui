import Controller from '@ember/controller';
import { get } from '@ember/object';

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
    },
    {
      name:            'repo_name',
      label:           '镜像名称',
    },
    {
      name:           'repo_tag',
      label:          '标签',
    },
    {
      name:           'operation',
      label:           '操作',
    },
    {
      name:           'op_time',
      classNames:     'text-right pr-20',
      label:           '时间戳',
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

      this.transitionToRoute( { queryParams: object } );
    },
  }
});
