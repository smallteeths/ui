import Resource from '@rancher/ember-api-store/models/resource';
import { reference } from '@rancher/ember-api-store/utils/denormalize';
import { get, computed } from '@ember/object';
import C from 'ui/utils/constants';
import PrincipalReference from 'ui/mixins/principal-reference';
import { inject as service } from '@ember/service';

export default Resource.extend(PrincipalReference, {
  router: service(),

  type: 'clusterRoleTemplateBinding',

  // canEdit:      false,
  cluster:      reference('clusterId'),
  roleTemplate: reference('roleTemplateId'),
  user:         reference('userId', 'user'),
  isCustom:     computed('roleTemplateId', function() {
    return !C.BASIC_ROLE_TEMPLATE_ROLES.includes(this.roleTemplateId);
  }),

  principalId: computed('userPrincipalId', 'groupPrincipalId', function() {
    return this.groupPrincipalId || this.userPrincipalId || null;
  }),

  canRemove: computed('links.remove', 'name', function() {
    return !!get(this, 'links.remove') && this.name !== 'creator';
  }),

  actions: {
    edit() {
      get(this, 'router').transitionTo('authenticated.cluster.security.members.edit', get(this, 'id'));
    },
  },

});
