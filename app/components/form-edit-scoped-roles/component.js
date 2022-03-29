import Errors from 'ui/utils/errors';
import Component from '@ember/component'
import { inject as service } from '@ember/service';
import {
  computed,
  get,
  set,
  setProperties,
  observer
} from '@ember/object';
import layout from './template';
import NewOrEdit from 'ui/mixins/new-or-edit';
import { next } from '@ember/runloop';

const CUSTOM = 'custom';

export default Component.extend(NewOrEdit, {
  globalStore: service(),
  intl:        service(),
  scope:       service(),

  layout,
  user:            null,
  primaryResource: null,
  unknownUser:     false,
  principal:       null,
  loading:         false,

  type:      null,
  cTyped:    null,
  stdUser:   null,
  admin:     null,
  mode:      null,

  init() {
    this._super(...arguments);
    const model = get(this, 'model.role').clone();

    setProperties(this, {
      primaryResource:  model,
      stdUser:         `${ get(this, 'type') }-member`,
      admin:           `${ get(this, 'type') }-owner`,
      cTyped:          get(this, 'type').capitalize(),
    });
    this.roleTemplateIdDidChanged();

    const principalId = model.principalId;

    this.loadPrincipal(principalId);
  },

  actions: {
    cancel() {
      if (this.cancel) {
        this.cancel();
      }
    },
    save(cb) {
      set(this, 'errors', null);

      if (!this.validate()) {
        if ( cb ) {
          cb();
        }

        return;
      }

      return this.primaryResource.save().then(() => this.doneSaving())
        .catch((err) => {
          set(this, 'errors', [Errors.stringify(err)]);

          return cb(false);
        });
    },
  },

  modeDidChanged: observer('mode', 'custom.{firstObject,length}', function() {
    const roleTemplateId = get(this, 'primaryResource.roleTemplateId');

    if (this.mode === CUSTOM && !this.custom.find((c) => c.id === roleTemplateId)) {
      set(this, 'primaryResource.roleTemplateId', get(this, 'custom.firstObject.id'));
    } else if (this.mode !== CUSTOM) {
      set(this, 'primaryResource.roleTemplateId', this.mode);
    }
  }),

  roleTemplateIdDidChanged: observer('primaryResource.roleTemplateId', 'userRoles.{firstObject,length}', function() {
    const roleTemplateId = get(this, 'primaryResource.roleTemplateId');

    if (this.baseRoles.includes(roleTemplateId) || this.userRoles.find((r) => r.id === roleTemplateId)) {
      set(this, 'mode', roleTemplateId);
    } else {
      set(this, 'mode', CUSTOM);
    }
  }),

  showAdmin: computed('mode', 'model.roles.@each.id', 'type', function() {
    const id = `${ get(this, 'type') }-owner`;
    const role = get(this, 'model.roles').findBy('id', id);

    if ( get(this, 'mode') === id ) {
      return true;
    }

    if ( role && get(role, 'locked') !== true ) {
      return true;
    }

    return false;
  }),

  showStdUser: computed('mode', 'model.roles.@each.id', 'type', function() {
    const id = `${ get(this, 'type') }-member`;
    const role = get(this, 'model.roles').findBy('id', id);

    if ( get(this, 'mode') === id ) {
      return true;
    }

    if ( role && get(role, 'locked') !== true ) {
      return true;
    }

    return false;
  }),

  showReadOnly: computed('model.roles.@each.id', 'mode', function() {
    const id = 'read-only';
    const role = get(this, 'model.roles').findBy('id', id);

    if ( get(this, 'mode') === id ) {
      return true;
    }

    if ( role && get(role, 'locked') !== true ) {
      return true;
    }

    return false;
  }),


  baseRoles: computed('type', function() {
    return [
      `${ get(this, 'type') }-admin`,
      `${ get(this, 'type') }-owner`,
      `${ get(this, 'type') }-member`,
      'read-only'
    ];
  }),

  userRoles: computed('model.roles.[]', 'type', function() {
    let roles = get(this, 'model.roles');
    let userDef = roles.filter((role) => !get(role, 'builtin')
        && !get(role, 'external')
        && !get(role, 'hidden')
        && (get(role, 'context') === get(this, 'type') || !get(role, 'context')));

    return userDef;
  }),

  custom: computed('baseRoles', 'model.roles.[]', 'type', function() {
    // built in
    let roles  = get(this, 'model.roles').filterBy('hidden', false);
    let excludes = get(this, 'baseRoles');
    let context = `${ get(this, 'type') }`;

    return roles.filter((role) => !excludes.includes(role.id)
        && get(role, 'builtin')
        && get(role, 'context') === context);
  }),

  validate() {
    var errors = this.get('errors', errors) || [];

    const current = (get(this, 'model.roleBindings') || []).filter((role) => {
      let id;

      if ( get(this, 'type') === 'project' ) {
        id = get(this, 'scope.currentProject.id');
      } else {
        id = get(this, 'scope.currentCluster.id');
      }

      return id === get(role, `${ get(this, 'type') }Id`) && get(role, 'userPrincipalId') === get(this, 'primaryResource.userPrincipalId');
    });

    if (get(this, 'mode') === 'custom') {
      const customRole = this.custom.find((r) => r.id === get(this, 'primaryResource.roleTemplateId'))

      if (!customRole) {
        errors.push(this.get('intl').t('rolesPage.new.errors.noSelectedRoles'));
      }

      if (customRole && current.findBy('roleTemplateId', customRole.id) ) {
        errors.push(this.get('intl').t('rolesPage.new.errors.roleAlreadyExists', { key: get(customRole, 'displayName') }));
      }
    } else if ( current.findBy('roleTemplateId', get(this, 'primaryResource.roleTemplateId')) ) {
      errors.push(this.get('intl').t('rolesPage.new.errors.roleAlreadyExists', { key: get(this, 'primaryResource.roleTemplate.displayName') }));
    }

    set(this, 'errors', errors);

    return this.get('errors.length') === 0;
  },

  loadPrincipal(principalId) {
    const store = this.globalStore;

    if ( principalId ) {
      let principal = store.getById('principal', principalId);

      if ( principal ) {
        set(this, 'principal', principal);

        return;
      }

      set(this, 'loading', true);

      store.find('principal', principalId, { forceReload: true }).then((principal) => {
        if ( this.isDestroyed || this.isDestroying ) {
          return;
        }

        next(() => {
          set(this, 'principal', principal);
        });
      }).catch((/* err*/) => {
        // Do something..
      }).finally(() => {
        if ( this.isDestroyed || this.isDestroying ) {
          return;
        }

        set(this, 'loading', false);
        set(this, 'unknownUser', true);
      });
    }
  }
});
