import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { get, computed } from '@ember/object';

export default Controller.extend({
  harbor:                  service(),
  prefs:                   service(),
  intl:                    service(),
  name:                    '',
  isAdmin: computed('access.me.hasAdmin', 'model.currentUserRoleId', function() {
    return !!get(this, 'access.me.hasAdmin') || get(this, 'model.currentUserRoleId') === '1';
  }),
  isSystemAdmin: computed('model.currentUser', function() {
    return get(this, 'model.currentUser.has_admin_role');
  }),
  isProjectAdmin: computed('isSystemAdmin', 'model.currentUserRoleId', function() {
    if (get(this, 'isSystemAdmin')) {
      return true;
    } else {
      return get(this, 'model.currentUserRoleId') === '1';
    }
  }),
  isMember: computed('isSystemAdmin', 'model.currentUserRoleId', function() {
    if (get(this, 'isSystemAdmin')) {
      return true;
    } else {
      return parseInt(get(this, 'model.currentUserRoleId'), 10) > 0;
    }
  }),
  transformStorageUsed: computed('model.summary.quota.used.storage', function() {
    const used = get(this, 'model.summary.quota.used.storage');

    return this.formatBytes(used)
  }),
  transformStorageMax: computed('model.summary.quota.hard.storage', function() {
    const hard = get(this, 'model.summary.quota.hard.storage');
    const intl = get(this, 'intl');

    if (hard === -1) {
      return intl.t('harborConfig.summary.infinity')
    }

    return this.formatBytes(hard)
  }),
  transformCountMax: computed('model.summary.quota.hard.count', function() {
    const hard = get(this, 'model.summary.quota.hard.count');
    const intl = get(this, 'intl');

    if (hard === -1) {
      return intl.t('harborConfig.summary.infinity')
    }

    return hard
  }),
  countPercent: computed('model.summary.quota.hard.count', 'model.summary.quota.used.count', function() {
    return this.formatPercent(get(this, 'model.summary.quota.used.count'), get(this, 'model.summary.quota.hard.count'))
  }),
  storagePercent: computed('model.summary.quota.hard.storage', 'model.summary.quota.used.storage', function() {
    return this.formatPercent(get(this, 'model.summary.quota.used.storage'), get(this, 'model.summary.quota.hard.storage'))
  }),
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) {
      return '0 Bytes'
    }

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${ parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) } ${ sizes[i] }`;
  },
  formatPercent(value, max) {
    if (max === -1 || value === 0) {
      return 0
    }
    if (value >= max) {
      return 100
    }

    return (value / max * 100).toFixed(2)
  }
});
