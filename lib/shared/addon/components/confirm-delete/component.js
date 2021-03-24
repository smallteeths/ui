import { computed, get, set, observer } from '@ember/object';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import Component from '@ember/component';
import { alternateLabel } from 'ui/utils/platform';
import ModalBase from 'ui/mixins/modal-base';
import layout from './template';
import { eachLimit } from 'async';
import C from 'ui/utils/constants';
import $ from 'jquery';

function hasSomeOfResourceType(resourceType) {
  return get(this, 'resources')
    .some((resource) => get(resource, 'type') === resourceType);
}

export default Component.extend(ModalBase, {
  settings:       service(),
  intl:           service(),

  layout,
  classNames:       ['medium-modal'],
  alternateLabel,
  forceDelete:    false,

  delayedConfirm: false,
  delayTimer:     null,
  awaitSeconds:   3,

  resources:        alias('modalService.modalOpts.resources'),
  onDeleteFinished: alias('modalService.modalOpts.onDeleteFinished'),
  init() {
    this._super(...arguments);
    get(this, 'btnDisabled') && this.delayTime(3);
  },
  didRender() {
    setTimeout(() => {
      try {
        $('BUTTON')[0].focus();
      } catch (e) {}
    }, 500);
  },
  actions: {
    confirm() {
      const resources = get(this, 'resources').slice().reverse();
      const onDeleteFinished = get(this, 'onDeleteFinished') || (() => {});

      eachLimit(resources, 5, (resource, cb) => {
        if ( !resource ) {
          return cb();
        }

        if ( resource.cb ) {
          // transfer forceDelete param to parent component
          const out = resource.cb({ forceDelete: get(this, 'forceDelete') });

          if ( out && out.finally ) {
            out.finally(cb);
          } else {
            cb();
          }

          return;
        } else {
          if ( get(this, 'forceDelete') ) {
            resource.delete({ url: `${ resource.linkFor('remove') }?gracePeriodSeconds=0` } ).finally(cb);
          } else {
            resource.delete().finally(cb);
          }
        }
      }, onDeleteFinished);

      this.send('cancel');
    },
  },

  visible: observer('modalService.modalVisible', function() {
    const v = get(this, 'modalService.modalVisible');

    if (!v) {
      clearTimeout(get(this, 'delayTimer'));
      set(this, 'delayTimer', null);
      set(this, 'awaitSeconds', 3);
    }
  }),
  btnDisabled: computed('awaitSeconds', 'isCluster', 'isEnvironment', 'isNamespace', 'isWorkload', 'modalService.modalVisible', function() {
    const v = get(this, 'modalService.modalVisible');

    if (v) {
      return get(this, 'awaitSeconds') > 0 && (get(this, 'isEnvironment') || get(this, 'isCluster') || get(this, 'isNamespace') || get(this, 'isWorkload'));
    }

    return false;
  }),

  showProtip: computed('modalService.modalOpts.showProtip', function() {
    let show = get(this, 'modalService.modalOpts.showProtip');

    if ( show === undefined ) {
      show = true;
    }

    return show;
  }),

  isEnvironment: computed('resources', function() {
    return !!get(this, 'resources').findBy('type', 'project');
  }),

  isCluster: computed('resources', function() {
    return !!get(this, 'resources').findBy('type', 'cluster');
  }),

  isNamespace: computed('resources', function() {
    return !!get(this, 'resources').findBy('type', 'namespace');
  }),

  isWorkload: computed('resources', function() {
    const types = ['deployment', 'job', 'cronJob', 'daemonSet', 'statefulSet', 'ingress', 'persistentVolumeClaim', 'service'];

    return types.some((type) => {
      return !!get(this, 'resources').findBy('type', type)
    })
  }),

  isPod: computed('resources', function() {
    return !!get(this, 'resources').findBy('type', 'pod');
  }),

  isClusterRoleTemplateBinding: computed('resources', function() {
    return !!get(this, 'resources').findBy('type', 'clusterRoleTemplateBinding');
  }),

  isGlobalRole: computed('resources', function() {
    return !!get(this, 'resources').findBy('type', 'globalRole');
  }),

  isSystemProject: computed('resources', function() {
    const project = get(this, 'resources').findBy('type', 'project');

    return project && get(project, 'isSystemProject');
  }),

  isSystemChart: computed('resources', function() {
    const app = get(this, 'resources').findBy('type', 'app') || {};

    return app && C.SYSTEM_CHART_APPS.includes(get(app, 'displayName'))
  }),

  isRke2NodeEtcd: computed('resources', function() {
    const nodes = get(this, 'resources');
    const atLeastOneEtcdBeingDeleted = nodes.filterBy('etcd').length >= 1;

    if (atLeastOneEtcdBeingDeleted) {
      const cluster = nodes.length >= 1 ? get(nodes.firstObject, 'cluster') : false;

      if (cluster) {
        const filteredEtcdNodes = (get(cluster, 'nodes') || []).filterBy('etcd');

        if (filteredEtcdNodes.length === 2) {
          return true;
        } else {
          return false;
        }
      }
    }

    return false;
  }),

  hasSystemProjectNamespace: computed('resources', function() {
    const namespaces = get(this, 'resources').filter((resource) => get(resource, 'type') === 'namespace' && get(resource, 'project.isSystemProject'));

    return get(namespaces, 'length') > 0;
  }),

  hasNamespaceResourceType: computed('resources', function() {
    return hasSomeOfResourceType.call(this, C.RESOURCE_TYPES.NAMESPACE);
  }),

  hasProjectResourceType: computed('resources', function() {
    return hasSomeOfResourceType.call(this, C.RESOURCE_TYPES.PROJECT);
  }),

  hasClusterResourceType: computed('resources', function() {
    return hasSomeOfResourceType.call(this, C.RESOURCE_TYPES.CLUSTER);
  }),

  resourceType: computed('hasClusterResourceType', 'hasNamespaceResourceType', 'hasProjectResourceType', 'resources', function() {
    if (get(this, 'hasNamespaceResourceType')) {
      return C.RESOURCE_TYPES.NAMESPACE;
    }

    if (get(this, 'hasProjectResourceType')) {
      return C.RESOURCE_TYPES.PROJECT;
    }

    if (get(this, 'hasClusterResourceType')) {
      return C.RESOURCE_TYPES.CLUSTER;
    }

    return null;
  }),
  delayTime(sec){
    let delayTimer = setTimeout( () => {
      if (sec > 0){
        set(this, 'awaitSeconds', --sec);
        this.delayTime(sec)
      }
    }, 1000);

    set(this, 'delayTimer', delayTimer);
  },
});
