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
    const roleId = get(this, 'currentUserRoleId');

    if (get(this, 'hasAdminRole') || roleId === '1' || roleId === '4') {
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
