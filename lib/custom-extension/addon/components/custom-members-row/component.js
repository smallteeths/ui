import Component from '@ember/component';
import layout from './template';
import { get, computed } from '@ember/object';
export default Component.extend({
  layout,
  model:      null,
  isLocal:    null,

  tagName:         'TR',
  classNames:      'main-row',
  translateKeyVal: {
    u:            '用户',
    guest:        '访客',
    developer:    '开发人员',
    projectAdmin: '项目管理员'
  },
  memberType: computed('model.entity_type', function() {
    return get(this, 'translateKeyVal')[get(this, 'model.entity_type')];
  }),
  memberRole: computed('model.entity_type', function() {
    return get(this, 'translateKeyVal')[get(this, 'model.role_name')];
  }),
});
