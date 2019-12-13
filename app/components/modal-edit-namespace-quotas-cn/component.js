import { alias } from '@ember/object/computed';
import Component from '@ember/component';
import NewOrEdit from 'shared/mixins/new-or-edit';
import ModalBase from 'shared/mixins/modal-base';
import layout from './template';
import { inject as service } from '@ember/service';
import { computed, set, get, setProperties } from '@ember/object';


export default Component.extend(ModalBase, NewOrEdit, {
  scope: service(),

  layout,
  classNames:    ['large-modal'],
  editing:       true,
  model:         null,

  allNamespaces:     null,
  allProjects:       null,
  tags:              null,
  beforeSaveModel:   null,

  callback:       alias('modalService.modalOpts.cb'),
  originalModel:  alias('modalService.modalOpts.model'),

  init() {
    this._super(...arguments);

    const orig  = get(this, 'originalModel');
    const clone = orig.clone();

    delete clone.services;

    setProperties(this, {
      model:         clone,
      allNamespaces: get(this, 'clusterStore').all('namespace'),
      allProjects:   get(this, 'globalStore').all('project')
        .filterBy('clusterId', get(this, 'scope.currentCluster.id')),
    })
  },

  didRender() {
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 500);
  },

  actions: {

    updateNsQuota(quota) {
      if ( quota ) {
        set(this, 'primaryResource.resourceQuota', { limit: quota });
      } else {
        set(this, 'primaryResource.resourceQuota', null);
      }
    },

  },

  projectLimit: computed('primaryResource.resourceQuota.{limit}', 'primaryResource.projectId', function() {
    const projectId = get(this, 'primaryResource.projectId');
    const project   = get(this, 'allProjects').findBy('id', projectId);

    return get(project, 'resourceQuota.limit');
  }),

  projectUsedLimit: computed('primaryResource.resourceQuota.{limit}', 'primaryResource.projectId', function() {
    const projectId = get(this, 'primaryResource.projectId');
    const project   = get(this, 'allProjects').findBy('id', projectId);

    return get(project, 'resourceQuota.usedLimit');
  }),

  nsDefaultQuota: computed('primaryResource.resourceQuota.{limit}', 'primaryResource.projectId', function() {
    const projectId = get(this, 'primaryResource.projectId');
    const project   = get(this, 'allProjects').findBy('id', projectId);

    return get(project, 'namespaceDefaultResourceQuota.limit');
  }),

  validate() {
    this._super();

    const errors      = get(this, 'errors') || [];
    const quotaErrors = get(this, 'primaryResource').validateResourceQuota(get(this, 'originalModel.resourceQuota.limit'));

    if ( quotaErrors.length > 0 ) {
      errors.pushObjects(quotaErrors);
    }

    set(this, 'errors', errors);

    return get(this, 'errors.length') === 0;
  },

  willSave() {
    set(this, 'beforeSaveModel', get(this, 'originalModel').clone());

    return this._super(...arguments);
  },

  didSave(pr) {
    const { projectId } = pr;

    if ( projectId !== get(this, 'beforeSaveModel.projectId') ) {
      return pr.doAction('move', { projectId }).then((pr) => pr);
    }
  },

  doneSaving() {
    get(this, 'callback')();
    // window.location.reload()
  }
});
