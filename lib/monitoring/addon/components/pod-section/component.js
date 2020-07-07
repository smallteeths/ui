import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { set, get, observer } from '@ember/object';
import { sortableNumericSuffix } from 'shared/utils/util';
import ManageLabels from 'shared/mixins/manage-labels';
import layout from './template';
import { searchFields as containerSearchFields } from 'ui/components/pod-dots/component';
import { later } from '@ember/runloop';
import C from 'ui/utils/constants';

function terminatedIcon(inst) {
  if ( inst.exitCode === 0 ) {
    return 'icon icon-dot-circlefill';
  } else {
    return 'icon icon-circle';
  }
}

function terminatedColor(inst) {
  if ( inst.exitCode === 0 ) {
    return 'text-success';
  } else {
    return 'text-error';
  }
}

const defaultStateMap = {
  'failed':                   {
    icon:  'icon icon-alert',
    color: 'text-error'
  },
  'pending':                  {
    icon:  'icon icon-tag',
    color: 'text-info'
  },
  'removing':                 {
    icon:  'icon icon-tag',
    color: 'text-info'
  },
  'running':                  {
    icon:  'icon icon-circle-o',
    color: 'text-success'
  },
  'succeeded':                {
    icon:  'icon icon-dot-circlefill',
    color: 'text-success'
  },
  'unknown':                  {
    icon:  'icon icon-help',
    color: 'text-warning'
  },
  'terminated':               {
    icon:  terminatedIcon,
    color: terminatedColor
  },
  'waiting':                  {
    icon:  'icon icon-tag',
    color: 'text-info'
  },
};

export default Component.extend(ManageLabels, {
  globalStore:          service(),
  scope:                service(),
  modalService:         service('modal'),
  router:               service(),
  growl:                service(),
  intl:                 service(),
  layout,
  sortBy:               'name',
  workloads:            null,
  namespaceProjectMap:        null,
  expanded:             false,
  loading:              false,
  timeOutAnchor:        null,
  model:                null,
  fetchPodsUrl:         '',
  expandedMap:          {},
  extraSearchFields:    ['id:prefix', 'displayIp:ip', 'namespaceId'],
  extraSearchSubFields: containerSearchFields,

  headers: [
    {
      name:        'expand',
      sort:        false,
      searchField: null,
      width:       30
    },
    {
      name:           'state',
      sort:           ['state', 'displayName'],
      searchField:    'displayState',
      translationKey: 'generic.state',
      width:          120
    },
    {
      name:           'projectName',
      sort:           ['projectName', 'name'],
      searchField:    'projectName',
      translationKey: 'generic.project',
      width:          120
    },
    {
      name:           'namespace',
      sort:           ['namespace', 'name'],
      searchField:    'namespace',
      translationKey: 'generic.namespace',
      width:          120
    },
    {
      name:           'name',
      sort:           ['sortName', 'id'],
      searchField:    'displayName',
      translationKey: 'generic.name',
      width:          360
    },
    {
      name:           'image',
      sort:           ['image', 'displayName'],
      searchField:    'image',
      translationKey: 'generic.image',
    },
  ],

  init() {
    this._super();
    this.expanedDidChange();
    const namespaceProjectMap = {};
    const allProjects = get(this, 'scope.allProjects');
    const currentClusterId = get(this, 'scope.currentCluster.id');
    const hostname = get(this, 'model.node.hostname');
    const url = `/k8s/clusters/${ currentClusterId }/api/v1/pods?fieldSelector=spec.nodeName=${ hostname }`;

    allProjects.forEach((projectItem) => {
      const projectClusterId = projectItem.clusterId;

      if (currentClusterId === projectClusterId) {
        const namespaces = projectItem.namespaces;

        namespaces.forEach((namespaceItem) => {
          namespaceProjectMap[namespaceItem.id] = {
            projectId:   namespaceItem.projectId,
            projectName: projectItem.name
          }
        });
      }
    });
    set(this, 'namespaceProjectMap', namespaceProjectMap);
    set(this, 'fetchPodsUrl', url);
  },

  willDestroyElement() {
    this.clearTimeOut();
    this._super();
  },

  actions:    {
    toggle(row) {
      this.expandedMap[row.displayName] = !row.expanded;
      set(row, 'expanded', !row.expanded);
    }
  },

  expanedDidChange: observer('expanded', 'expandAll', function() {
    if ( this.expanded || this.expandAll ) {
      set(this, 'loading', true);
      this.fetchPods();
    } else {
      this.clearTimeOut();
    }
  }),

  clearTimeOut() {
    const timeOutAnchor = this.timeOutAnchor;

    if (timeOutAnchor){
      clearTimeout(timeOutAnchor);
      set(this, 'timeOutAnchor', timeOutAnchor);
    }
  },

  showError(err) {
    this.growl.fromError('Error', get(err, 'body.message') || err);
  },

  fetchPods() {
    const namespaceProjectMap = this.namespaceProjectMap;
    const expandedMap = this.expandedMap;

    this.globalStore.rawRequest({
      url:    this.fetchPodsUrl,
      method: 'GET',
    })
      .then((xhr) => {
        set(this, 'loading', false);
        const workloads = (xhr.body.items || []).map((item) => {
          const state = get(item, 'metadata.deletionTimestamp') ? 'removing' : get(item, 'status.phase');
          const name = get(item, 'metadata.name');
          const namespace = get(item, 'metadata.namespace');
          let projectId = ''
          let projectName = get(this, 'intl').t('generic.all')

          if (namespaceProjectMap[namespace]) {
            projectId = namespaceProjectMap[namespace].projectId;
            projectName = namespaceProjectMap[namespace].projectName;
          }

          const containers = get(item, 'status.containerStatuses') || [];
          const initContainers = get(item, 'status.initContainerStatuses') || [];
          const totalContainers = [].concat(containers, initContainers);
          const totalImages = totalContainers.length;
          const podIP = get(item, 'status.podIP');
          const hostIP = get(item, 'status.hostIP');
          const wrapper = this;
          let restartCount = 0;
          let displayImages = totalContainers.map((containerItem) => {
            return containerItem.image;
          });
          let displayImage = '';

          if (totalImages > 1) {
            displayImage = this.intl.t('podPage.displayImage', {
              image:   containers[0].image,
              sidecar: totalImages - 1
            });
          } else if ( totalImages ) {
            displayImage = get(containers, 'firstObject.image');
          } else {
            displayImage = this.intl.t('generic.unknown');
          }

          totalContainers.forEach((containerItem) => {
            const containerState = containerItem.state;
            const stateKey = Object.keys(containerState)[0];
            let stateIcon = '';
            let stateColor = '';

            if (typeof defaultStateMap[stateKey].icon === 'function') {
              stateIcon = defaultStateMap[stateKey].icon(containerState[stateKey]);
            } else {
              stateIcon = defaultStateMap[stateKey].icon;
            }

            if (typeof defaultStateMap[stateKey].color === 'function') {
              stateColor = defaultStateMap[stateKey].color(containerState[stateKey]);
            } else {
              stateColor = defaultStateMap[stateKey].color;
            }

            restartCount += get(containerItem, 'restartCount') || 0;

            Object.assign(containerItem, {
              stateIcon,
              stateColor,
              canShell:        C.CAN_SHELL_STATES.indexOf(stateKey) > -1,
              stateBackground: stateColor.replace('text-', 'bg-'),
              hasSidekicks:    true
            });
          });

          return {
            id:                `${ namespace }:${ name }`,
            bulkActions:       false,
            _availableActions: [
              {
                label:     'action.logs',
                icon:      'icon icon-file',
                action:    'logs',
                enabled:   true,
                altAction: 'popoutLogs',
                sort:      96
              },
              {
                action:    'shell',
                altAction: 'popoutShell',
                enabled:   true,
                icon:      'icon icon-terminal',
                label:     'action.execute',
                sort:      97
              },
              {
                divider: true,
                sort:    98
              },
              {
                sort:    99,
                label:   'action.viewInApi',
                icon:    'icon icon-external-link',
                action:  'goToApi',
                enabled: true
              },
              {
                divider: true,
                sort:    100
              },
              {
                action:    'promptDelete',
                altAction: 'delete',
                enabled:   true,
                icon:      'icon icon-trash',
                label:     'action.remove',
                sort:      101
              },
            ],
            name,
            displayImages,
            podIP,
            hostIP,
            namespace,
            projectId,
            projectName,
            restartCount,
            displayState:    state,
            stateBackground: defaultStateMap[state.toLowerCase()].color.replace('text-', 'bg-'),
            displayName:     name,
            displayImage,
            sortName:        sortableNumericSuffix(name),
            startTime:       get(item, 'status.startTime'),
            namespaceId:     namespace,
            displayIp:       podIP,
            nodeDisplayName: `ip-${ hostIP }`,
            project_id:      projectId,
            detailPageUrl:   `/p/${ projectId }/workloads/${ namespace }:${ name }`,
            canExpand:       totalContainers.length > 1,
            containers:      totalContainers,
            containerName:   containers[0].name,
            showActions:     true,
            expanded:        !!expandedMap[name],
            hasSidekicks:    true,
            canRemove:       true,
            send:            this.send,
            type:            'pod',
            actions:         {
              promptDelete() {
                get(wrapper, 'modalService').toggleModal('confirm-delete', {
                  escToClose: true,
                  resources:  [this]
                });
              },
              logs() {
                get(wrapper, 'modalService').toggleModal('modal-container-logs', {
                  model:         this,
                  containerName: this.containerName
                });
              },
              popoutLogs() {
                const projectId = this.projectId;
                const podId = this.name;
                const namespace = this.namespace;
                const route = wrapper.router.urlFor('authenticated.project.container-log', projectId);

                later(() => {
                  window.open(`//${ window.location.host }${ route }?podId=${ namespace }:${ podId }&isPopup=true`, '_blank', 'toolbars=0,width=900,height=700,left=200,top=200');
                });
              },
              goToApi() {
                let url = `/v3/project/${ this.projectId }/pods/${ this.id }`

                window.open(url, '_blank');
              },
              shell() {
                get(wrapper, 'modalService').toggleModal('modal-shell', {
                  model:    this,
                  instance: this
                });
              },
              delete() {
                this.cb({ forceDelete: false });
              }
            },
            cb(options) {
              const deleteUrl = `/v3/project/${ this.projectId }/pods/${ this.id }${ options.forceDelete ? '?gracePeriodSeconds=0' : '' }`;

              wrapper.globalStore.rawRequest({
                url:    deleteUrl,
                method: 'DELETE',
              })
                .then(() => {
                  set(this, 'displayState', 'removing');
                  set(this, 'stateBackground', 'bg-info');
                  wrapper.clearTimeOut();
                  setTimeout(() => {
                    wrapper.fetchPods();
                  }, 15000);
                })
                .catch((err) => {
                  wrapper.showError(err)
                });
            }
          };
        });

        set(this, 'workloads', workloads);
        const timeOutAnchor = setTimeout(() => {
          this.fetchPods();
        }, 60000);

        set(this, 'timeOutAnchor', timeOutAnchor);
      })
      .catch((e) => {
        this.showError(e);
      })
  },
});
