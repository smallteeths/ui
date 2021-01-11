import Component from '@ember/component';
import layout from './template';
import { get, computed } from '@ember/object';
import { inject as service } from '@ember/service';
export default Component.extend({
  intl:                  service(),
  layout,
  model:      null,
  isLocal:    null,

  tagName:         'TR',
  classNames:      'main-row',
  translateKeyVal: computed('intl.locale', function() {
    const intl = get(this, 'intl');
    let obj = {
      u:            intl.t('harborConfig.table.roleItem.user'),
      guest:        intl.t('harborConfig.table.roleItem.visitor'),
      developer:    intl.t('harborConfig.table.roleItem.developer'),
      projectAdmin: intl.t('harborConfig.table.roleItem.admin'),
      master:       intl.t('harborConfig.table.roleItem.master'),
      limitedGuest: intl.t('harborConfig.table.roleItem.limitedGuest'),
      maintainer:   intl.t('harborConfig.table.roleItem.maintainer'),
    }

    return obj;
  }),
  memberType: computed('model.entity_type', 'translateKeyVal', function() {
    return get(this, 'translateKeyVal')[get(this, 'model.entity_type')];
  }),
  memberRole: computed('model.{entity_type,role_name}', 'translateKeyVal', function() {
    return get(this, 'translateKeyVal')[get(this, 'model.role_name')];
  }),
});
