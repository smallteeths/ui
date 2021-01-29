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
      width:          200,
    },
    {
      name:           'targets',
      sort:           false,
      search:         false,
      translationKey: 'ingressPage.table.targets.label',
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
      get(this, 'router').transitionTo('authenticated.project.f5.controllers.detail', id, { queryParams: { type } });
    }
  },

  rows: computed('model.virtualservers.[]', 'model.transportservers.[]', function() {
    const out = (get(this, 'model.virtualservers') || []).slice();

    out.addObjects(get(this, 'model.transportservers') || []);

    return out;
  }),

});
