import { alias } from '@ember/object/computed';
import { get, computed, set } from '@ember/object';
import { inject as service } from '@ember/service';
import Controller, { inject as controller } from '@ember/controller';

// const NONE = 'none';

export default Controller.extend({
  prefs:             service(),
  scope:             service(),
  settings:          service(),
  intl:              service(),
  projectController: controller('authenticated.project'),

  secretsController: controller('authenticated.project.secrets'),

  queryParams:  ['sortBy'],
  sortBy:       'name',
  resource:    ['namespacedsecret', 'secret'],

  headers: [
    {
      name:           'state',
      sort:           ['sortState', 'name', 'id'],
      type:           'string',
      searchField:    'displayState',
      translationKey: 'generic.state',
      width:          125,
    },
    {
      name:           'name',
      sort:           ['name', 'id'],
      translationKey: 'generic.name',
    },
    {
      name:           'namespace',
      translationKey: 'generic.namespace',
      searchField:    'namespace.displayName',
      sort:           ['namespace.displayName', 'name', 'id'],
    },
    {
      name:           'keys',
      translationKey: 'secretsPage.table.keys',
      searchField:    'keys',
      sort:           ['firstKey', 'name', 'id'],
    },
    {
      classNames:     'text-right pr-20',
      name:           'created',
      translationKey: 'generic.created',
      sort:           ['created:desc', 'name', 'id'],
      searchField:    false,
      type:           'string',
      width:          150,
    },
  ],

  group:        alias('projectController.group'),
  groupTableBy: alias('projectController.groupTableBy'),

  namespace: computed('model.namespaceId', {
    get() {
      return get(this, 'model.namespaceId');
    },
    set(k, v) {
      if (typeof v === 'string') {
        set(this, 'secretsController.namespaceId', v)
      }

      return v;
    }
  }),

  enableLoadResourceByNamespace: computed('settings.enable-load-resource-by-namespace', function() {
    return get(this, 'settings.enable-load-resource-by-namespace');
  }),

  projectNamespaces: computed('model.namespaces.@each.state', 'scope.currentProject.id', 'intl.locale', function() {
    return [{
      id:          '',
      displayName: get(this, 'intl').t('generic.all')
    }, ...get(this, 'model.namespaces').filter( (ns) => get(ns, 'projectId') === get(this, 'scope.currentProject.id'))];
  }),

  rows: computed('enableLoadResourceByNamespace', 'model.namespaceId', 'model.namespacedSecrets.@each.type', 'model.projectSecrets.@each.type', function() {
    if (this.enableLoadResourceByNamespace) {
      const proj = get(this, 'model.projectSecrets').filterBy('type', 'secret').filterBy('namespaceId', get(this, 'model.namespaceId') || null);
      const ns = get(this, 'model.namespacedSecrets').filterBy('type', 'namespacedSecret').filterBy('namespaceId', get(this, 'model.namespaceId') || null);
      const out = proj.concat(ns);

      return out;
    }

    const proj = get(this, 'model.projectSecrets').filterBy('type', 'secret');
    const ns = get(this, 'model.namespacedSecrets').filterBy('type', 'namespacedSecret');
    const out = proj.concat(ns);

    return out;
  }),
});
