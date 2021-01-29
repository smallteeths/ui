import { alias } from '@ember/object/computed';
import { get, computed } from '@ember/object';
import { inject as service } from '@ember/service';
import Controller, { inject as controller } from '@ember/controller';

export default Controller.extend({
  scope:  service(),
  router: service(),

  projectController: controller('authenticated.project'),
  queryParams:       ['sortBy'],
  sortBy:            'name',

  headers: [
    {
      name:           'name',
      sort:           ['sortName', 'id'],
      searchField:    'displayName',
      translationKey: 'generic.name',
    },
    {
      name:           'hosts',
      sort:           false,
      search:         false,
      translationKey: 'generic.domainName',
    },
    {
      classNames:     'text-right pr-20',
      name:           'created',
      sort:           ['created', 'id'],
      searchField:    false,
      translationKey: 'generic.created',
      width:          200,
    },
  ],

  group:             alias('projectController.group'),
  groupTableBy:      alias('projectController.groupTableBy'),

  actions: {
    goto(type, id) {
      get(this, 'router').transitionTo('authenticated.project.f5.controllers.controller', id, { queryParams: { controllerType: type } });
    }
  },

  rows: computed('model.tlsprofiles.[]', function() {
    const out = (get(this, 'model.tlsprofiles') || []).slice();

    return out;
  }),

});
