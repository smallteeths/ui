import Controller from '@ember/controller';
import { get, set, computed, observer } from '@ember/object'
import { inject as service } from '@ember/service';

export default Controller.extend({
  harbor:                 service(),
  config:                 {},
  actions:                {
    savePublicConfig(cb) {
      let params = {};

      Object.assign(params, get(this, 'config'))
      params.public ? params.public = 'true' : params.public = 'false';
      get(this, 'harbor').setProjectPublic( { metadata: params }, get(this, 'model.projectId')).then(() => {
        cb(true);
        this.send('refreshModel');
      }).catch(() => {
        cb(false);
        this.send('refreshModel');
      });
    },
    cancelPublicConfig() {
      this.configChanged();
    },
    changePublic(isPublic) {
      set(this, 'config.public', isPublic);
    }
  },
  configChanged: observer('model.config', function() {
    const metaData = Object.assign({}, get(this, 'model.config'));

    if (metaData.public === 'false') {
      metaData.public = false;
    } else {
      metaData.public = true;
    }
    set(this, 'config', metaData);
  }),
  saveDisabled: computed('model.config.public', 'config.public', function() {
    const modelConfig = get(this, 'model.config');
    const config = get(this, 'config');

    return modelConfig.public === `${ config.public }`
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
});