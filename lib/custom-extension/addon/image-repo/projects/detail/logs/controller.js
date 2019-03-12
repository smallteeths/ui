import Controller from '@ember/controller';
import { get } from '@ember/object';

export default Controller.extend({
  queryParams:            ['page', 'name'],
  page:                   1,
  searchText:             '',
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
      this.transitionToRoute({ queryParams: { name: val } });
    },
  }
});
