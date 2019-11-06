import Component from '@ember/component';
import layout from './template';
import { get, computed } from '@ember/object';

export default Component.extend({
  layout,
  model:        null,
  isLocal:      null,
  hasAdminRole: false,

  tagName:         'TR',
  classNames:      'main-row',
  actions:    {
    handleMenuClick(command) {
      this.sendAction('command', command, get(this, 'model'));
    }
  },
  resourceActions: computed('hasAdminRole', 'model.current_user_role_id', function() {
    if (get(this, 'hasAdminRole') || `${ get(this, 'model.current_user_role_id') }` === '1') {
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