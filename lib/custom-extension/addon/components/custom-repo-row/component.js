import Component from '@ember/component';
import layout from './template';
import { get, computed } from '@ember/object';

export default Component.extend({
  layout,
  model:             null,
  currentUserRoleId: null,
  hasAdminRole:      false,
  isLocal:           null,

  tagName:         'TR',
  classNames:      'main-row',
  actions:    {
    handleMenuClick(command) {
      this.sendAction('command', command, get(this, 'model'));
    }
  },
  resourceActions: computed('hasAdminRole', 'currentUserRoleId', function(){
    if (get(this, 'hasAdminRole') || get(this, 'currentUserRoleId') === '1') {
      return [
        {
          label:  'action.remove',
          icon:     'icon icon-trash',
          action: 'remove'
        },
      ];
    } else {
      return [];
    }
  }),
});
