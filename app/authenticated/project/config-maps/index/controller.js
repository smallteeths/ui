import { alias } from '@ember/object/computed';
import { get, set, computed } from '@ember/object';
import Controller, { inject as controller } from '@ember/controller';
import { inject as service } from '@ember/service';

export const headers = [
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
    translationKey: 'configMapsPage.table.keys',
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
];

export default Controller.extend({
  settings: service(),
  scope:    service(),

  projectController: controller('authenticated.project'),

  configMapsController: controller('authenticated.project.configMaps'),

  queryParams:  ['sortBy'],
  sortBy:       'name',
  resource:    ['configmap'],

  headers,

  namespaceId: '',

  group:        alias('projectController.group'),
  groupTableBy: alias('projectController.groupTableBy'),

  namespace: computed('model.namespaceId', {
    get() {
      return get(this, 'model.namespaceId');
    },
    set(k, v) {
      if (typeof v === 'string') {
        set(this, 'configMapsController.namespaceId', v)
      }
    }
  }),

  enableLoadResourceByNamespace: computed('settings.enable-load-resource-by-namespace', function() {
    return get(this, 'settings.enable-load-resource-by-namespace');
  }),

  projectNamespaces: computed('model.namespaces.@each.state', 'scope.currentProject.id', function() {
    return get(this, 'model.namespaces').filter( (ns) => get(ns, 'projectId') === get(this, 'scope.currentProject.id'));
  }),

  rows: computed('model.configMaps.@each.type', 'enableLoadResourceByNamespace', function() {
    if (this.enableLoadResourceByNamespace) {
      return get(this, 'model.configMaps').filterBy('type', 'configMap').filterBy('namespaceId', get(this, 'model.namespaceId'))
    }

    return get(this, 'model.configMaps').filterBy('type', 'configMap');
  }),
});
