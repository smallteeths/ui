import { getProjectId, getClusterId, bulkAdd } from 'ui/utils/navigation-tree';
import { get } from '@ember/object';

const rootNav = [
  // Project
  {
    scope:          'project',
    id:             'infra',
    localizedLabel: 'nav.infra.tab',
    icon:           'authenticated-icon',
    ctx:            [getProjectId],
    submenu:        [
      {
        id:             'containers',
        localizedLabel: 'nav.containers.tab',
        route:          'authenticated.project.index',
        ctx:            [getProjectId],
        resource:       ['workload', 'ingress', 'service'],
        resourceScope:  'project',
        currentWhen:    [
          'containers',
          'workload',
          'ingresses',
          'authenticated.project.dns',
          'volumes',
        ],
        initExpand: 'containers.index',
      },
      {
        id:             'hpa',
        localizedLabel: 'nav.infra.hpa',
        route:          'authenticated.project.hpa',
        ctx:            [getProjectId],
        resource:       ['horizontalpodautoscaler'],
        resourceScope:  'project',
        initExpand:     'authenticated.project.hpa.index'
      },
      {
        id:             'pipelines',
        localizedLabel: 'nav.infra.pipelines',
        route:          'authenticated.project.pipeline.pipelines',
        ctx:            [getProjectId],
        resource:       [],
        resourceScope:  'project',
        initExpand:     'authenticated.project.pipeline.pipelines.index'
      },
      {
        id:             'istio',
        localizedLabel: 'nav.tools.istio',
        route:          'authenticated.project.istio.index',
        ctx:            [getProjectId],
        resource:       [],
        resourceScope:  'project',
        currentWhen:    [
          'authenticated.project.istio.project-istio',
        ],
        initExpand:     'authenticated.project.istio.index'
      },
      {
        id:             'infra-secrets',
        localizedLabel: 'nav.infra.secrets',
        route:          'authenticated.project.secrets',
        ctx:            [getProjectId],
        resource:       ['namespacedsecret', 'secret', 'dockercredential', 'certificate'],
        resourceScope:  'project',
        currentWhen:    [
          'authenticated.project.certificates',
          'authenticated.project.registries',
          'authenticated.project.secrets',
        ],
        initExpand:     'authenticated.project.secrets.index'
      },
      {
        id:             'infra-config-maps',
        localizedLabel: 'nav.infra.configMaps',
        route:          'authenticated.project.config-maps',
        ctx:            [getProjectId],
        resource:       ['configmap'],
        resourceScope:  'project',
        initExpand:     'authenticated.project.config-maps.index'
      },
    ],
  },
  {
    scope:          'project',
    id:             'project-apps',
    localizedLabel: 'nav.apps.tab',
    route:          'apps-tab',
    icon:           'apps-icon',
    ctx:            [getProjectId],
    resource:       ['app'],
    resourceScope:  'project',
  },
  {
    scope:          'project',
    id:             'namespaces',
    localizedLabel: 'nav.project.namespaces',
    route:          'authenticated.project.ns.index',
    icon:           'projects-icon',
    ctx:            [getProjectId],
    resource:       ['namespace'],
    resourceScope:  'cluster',
  },
  {
    scope:          'project',
    id:             'project-security-roles',
    localizedLabel: 'nav.infra.members',
    route:          'authenticated.project.security.members',
    icon:           'members-icon',
    resource:       ['projectroletemplatebinding'],
    resourceScope:  'global',
    ctx:            [getProjectId],
  },
  {
    scope:          'project',
    id:             'quotas',
    localizedLabel: 'quotasCn.quotas',
    route:          'authenticated.project.quotas-cn.index',
    icon:           'quotas-icon',
    ctx:            [getProjectId],
    resource:       ['namespace'],
    resourceScope:  'cluster',
  },
  {
    scope:          'project',
    id:             'project-tools',
    localizedLabel: 'nav.tools.tab',
    ctx:            [getProjectId],
    resource:       [],
    resourceScope:  'global',
    icon:           'tools-icon',
    submenu:        [
      {
        id:             'tools-alerts',
        localizedLabel: 'nav.tools.alerts',
        route:          'authenticated.project.alert',
        resource:       [],
        ctx:            [getProjectId],
        resourceScope:  'global',
        initExpand:     'authenticated.project.alert.index'
      },
      {
        id:             'manage-catalogs',
        localizedLabel: 'nav.tools.catalogs',
        route:          'authenticated.project.project-catalogs',
        ctx:            [getProjectId],
        resource:       ['catalog', 'project-catalog'],
        resourceScope:  'global',
        initExpand:     'authenticated.project.project-catalogs'
      },
      {
        id:             'tools-logging',
        localizedLabel: 'nav.tools.logging',
        route:          'authenticated.project.logging',
        resourceScope:  'global',
        resource:       [],
        ctx:            [getProjectId],
        initExpand:     'authenticated.project.logging.logging'
      },
      {
        id:             'tools-monitoring',
        localizedLabel: 'nav.tools.monitoring',
        route:          'authenticated.project.monitoring.project-setting',
        resourceScope:  'global',
        resource:       [],
        ctx:            [getProjectId],
        initExpand:     'authenticated.project.monitoring.project-setting'
      },
      {
        id:             'tools-pipeline',
        localizedLabel: 'nav.tools.pipeline',
        route:          'authenticated.project.pipeline.settings',
        resource:       ['sourcecodeproviderconfig'],
        resourceScope:  'project',
        ctx:            [getProjectId],
        initExpand:     'authenticated.project.pipeline.settings'
      },
    ]
  },
  {
    scope:          'project',
    id:             'project-audit-log',
    localizedLabel: 'nav.auditLog.tab',
    route:          'authenticated.project.audit-log.index',
    icon:           'auditlog-icon',
    resourceScope:  'global',
    resource:       [],
    ctx:            [getProjectId],
    condition() {
      return !!(get(this, 'settings.asMap')['auditlog-server-url'] && get(this, 'settings.asMap')['auditlog-server-url']['value']);
    }
  },
  // Cluster
  {
    scope:          'cluster',
    id:             'cluster-k8s',
    localizedLabel: 'nav.cluster.dashboard',
    icon:           'cluster-icon',
    route:          'authenticated.cluster.monitoring.index',
    ctx:            [getClusterId],
    resource:       ['node'],
    resourceScope:  'global',
  },
  {
    scope:          'cluster',
    id:             'cluster-nodes',
    localizedLabel: 'nav.cluster.nodes',
    icon:           'host-icon',
    route:          'authenticated.cluster.nodes',
    ctx:            [getClusterId],
    resource:       ['node'],
    resourceScope:  'global',
  },
  {
    scope:          'cluster',
    id:             'cluster-vlansubnet',
    localizedLabel: 'nav.cluster.vlansubnet',
    icon:           'macvlan-icon',
    route:          'authenticated.cluster.vlansubnet.index',
    ctx:            [getClusterId],
    resourceScope:  'global',
  },
  {
    scope:          'cluster',
    id:             'cluster-storage',
    localizedLabel: 'nav.cluster.storage.tab',
    ctx:            [getClusterId],
    resource:       ['clusterroletemplatebinding'],
    icon:           'storage-icon',
    resourceScope:  'global',
    submenu:        [
      {
        scope:          'cluster',
        id:             'cluster-storage-volumes',
        localizedLabel: 'nav.cluster.storage.volumes',
        route:          'authenticated.cluster.storage.persistent-volumes.index',
        ctx:            [getClusterId],
        resource:       ['project'],
        resourceScope:  'global',
        initExpand:     'authenticated.cluster.storage.persistent-volumes.index'
      },
      {
        scope:          'cluster',
        id:             'cluster-storage-classes',
        localizedLabel: 'nav.cluster.storage.classes',
        route:          'authenticated.cluster.storage.classes.index',
        ctx:            [getClusterId],
        resource:       ['project'],
        resourceScope:  'global',
        initExpand:     'authenticated.cluster.storage.classes.index'
      },
    ]
  },
  {
    scope:          'cluster',
    id:             'cluster-projects',
    localizedLabel: 'nav.cluster.projects',
    icon:           'projects-icon',
    route:          'authenticated.cluster.projects.index',
    ctx:            [getClusterId],
    resource:       ['project'],
    resourceScope:  'global',
  },
  {
    scope:          'cluster',
    id:             'cluster-security-roles',
    localizedLabel: 'nav.cluster.members',
    route:          'authenticated.cluster.security.members.index',
    icon:           'members-icon',
    resource:       ['clusterroletemplatebinding'],
    resourceScope:  'global',
    ctx:            [getClusterId],
  },
  {
    scope:          'cluster',
    id:             'cluster-tools',
    localizedLabel: 'nav.tools.tab',
    ctx:            [getClusterId],
    resource:       [],
    resourceScope:  'global',
    icon:           'tools-icon',
    submenu:        [
      {
        id:             'cluster-tools-alert',
        localizedLabel: 'nav.tools.alerts',
        route:          'authenticated.cluster.alert',
        resourceScope:  'global',
        resource:       [],
        ctx:            [getClusterId],
        initExpand:     'authenticated.cluster.alert.index'
      },
      {
        id:             'cluster-tools-backups',
        localizedLabel: 'nav.tools.backups',
        route:          'authenticated.cluster.backups',
        resourceScope:  'global',
        resource:       ['etcdbackup'],
        ctx:            [getClusterId],
        initExpand:     'authenticated.cluster.backups.index',
        condition() {
          return get(this, 'cluster.rancherKubernetesEngineConfig')
        }
      },
      {
        scope:          'cluster',
        id:             'cluster-catalogs',
        localizedLabel: 'nav.admin.catalogs',
        route:          'authenticated.cluster.cluster-catalogs',
        ctx:            [getClusterId],
        resource:       ['catalog', 'cluster-catalog'],
        resourceScope:  'global',
        initExpand:     'authenticated.cluster.cluster-catalogs',
      },
      {
        id:             'cluster-tools-notifiers',
        localizedLabel: 'nav.tools.notifiers',
        route:          'authenticated.cluster.notifier',
        resourceScope:  'global',
        resource:       [],
        ctx:            [getClusterId],
        initExpand:     'authenticated.cluster.notifier.index',
      },
      {
        id:             'cluster-tools-logging',
        localizedLabel: 'nav.tools.logging',
        route:          'authenticated.cluster.logging',
        resourceScope:  'global',
        resource:       [],
        ctx:            [getClusterId],
        initExpand:     'authenticated.cluster.logging.logging',
      },
      {
        id:             'cluster-tools-monitoring',
        localizedLabel: 'nav.tools.monitoring',
        route:          'authenticated.cluster.monitoring.cluster-setting',
        resourceScope:  'global',
        resource:       [],
        ctx:            [getClusterId],
        initExpand:     'authenticated.cluster.monitoring.cluster-setting',
      },
      {
        id:                       'cluster-tools-istio',
        localizedLabel:           'nav.tools.istio',
        route:                    'authenticated.cluster.istio.cluster-setting',
        resourceScope:            'global',
        resource:                 [],
        ctx:                      [getClusterId],
        initExpand:               'authenticated.cluster.istio.cluster-setting',
      },
    ],
  },
  {
    scope:          'cluster',
    id:             'cluster-audit-log',
    localizedLabel: 'nav.auditLog.tab',
    route:          'authenticated.cluster.audit-log.index',
    icon:           'auditlog-icon',
    resourceScope:  'global',
    resource:       [],
    ctx:            [getClusterId],
    condition() {
      return !!(get(this, 'settings.asMap')['auditlog-server-url'] && get(this, 'settings.asMap')['auditlog-server-url']['value']);
    }
  },

  // Global
  {
    scope:          'global',
    id:             'global-clusters',
    localizedLabel: 'nav.admin.clusters.tab',
    icon:           'cluster-icon',
    route:          'global-admin.clusters',
    resource:       ['cluster'],
    resourceScope:  'global',
  },
  {
    scope:          'global',
    id:             'multi-cluster-apps',
    localizedLabel: 'nav.admin.multiClusterApps',
    icon:           'apply-icon',
    route:          'global-admin.multi-cluster-apps',
    resource:       ['multiclusterapp'],
    resourceScope:  'global',
  },
  {
    scope:          'global',
    id:             'global-image-repo',
    icon:           'images-icon',
    localizedLabel: 'nav.admin.imageRepo.tab',
    resource:       [],
    resourceScope:  'global',
    submenu:        [
      {
        scope:          'global',
        id:             'global-image-repo-admin-config',
        localizedLabel: 'nav.admin.imageRepo.config',
        route:          'custom-extension.image-repo.admin-config',
        resource:       [],
        initExpand:     'custom-extension.image-repo.admin-config',
        condition() {
          return !!get(this, 'access.me.hasAdmin');
        }
      },
      // {
      //   scope:          'global',
      //   id:             'global-image-repo-registries',
      //   localizedLabel: 'nav.admin.imageRepo.registries',
      //   icon:           'icon icon-key',
      //   route:          'custom-extension.image-repo.registries',
      //   resource:       [],
      //   condition() {
      //     return !!get(this, 'access.me.hasAdmin');
      //   }
      // },
      {
        scope:          'global',
        id:             'global-image-repo-user-config',
        localizedLabel: 'nav.admin.imageRepo.config',
        route:          'custom-extension.image-repo.user-config',
        resource:       [],
        initExpand:     'custom-extension.image-repo.user-config',
        condition() {
          return !get(this, 'access.me.hasAdmin');
        }
      },
      {
        scope:          'global',
        id:             'global-image-repo-projects',
        localizedLabel: 'nav.admin.imageRepo.projects',
        route:          'custom-extension.image-repo.projects',
        resource:       [],
        initExpand:     'custom-extension.image-repo.projects',
        condition() {
          if (get(this, 'access.me.hasAdmin')) {
            return true
          } else {
            const a = get(this, 'access.me.annotations');

            return !!(a && a['authz.management.cattle.io.cn/harborauth']);
          }
        }
      },
      {
        scope:          'global',
        id:             'global-image-repo-logs',
        localizedLabel: 'nav.admin.imageRepo.logs',
        route:          'custom-extension.image-repo.logs',
        resource:       [],
        initExpand:     'custom-extension.image-repo.logs',
        condition() {
          if (get(this, 'access.me.hasAdmin')) {
            return true
          } else {
            const a = get(this, 'access.me.annotations');

            return !!(a && a['authz.management.cattle.io.cn/harborauth']);
          }
        }
      },
    ],
  },
  {
    scope:          'global',
    id:             'global-accounts',
    icon:           'user-icon',
    localizedLabel: 'nav.admin.accounts',
    route:          'global-admin.accounts',
    resource:       ['user'],
    resourceScope:  'global',
  },
  {
    scope:          'global',
    id:             'global-settings',
    icon:           'settings-icon',
    localizedLabel: 'nav.settings.tab',
    route:          'global-admin.settings.advanced',
    resourceScope:  'global',
  },
  {
    scope:          'global',
    id:             'global-security',
    icon:           'security-icon',
    localizedLabel: 'nav.admin.security.tab',
    submenu:        [
      {
        id:             'global-security-roles',
        localizedLabel: 'nav.admin.security.roles',
        route:          'global-admin.security.roles.index',
        resource:       ['roletemplate'],
        resourceScope:  'global',
        initExpand:     'global-admin.security.roles.index'
      },
      {
        id:             'global-security-roles',
        localizedLabel: 'nav.admin.security.podSecurityPolicies',
        route:          'global-admin.security.policies',
        resource:       ['podsecuritypolicytemplate'],
        resourceScope:  'global',
        initExpand:     'global-admin.security.policies.index'
      },
      {
        id:             'global-security-authentication',
        localizedLabel: 'nav.admin.security.authentication',
        route:          'global-admin.security.authentication',
        initExpand:     'global-admin.security.authentication.localauth',
        condition() {
          const authConfigs = this.get('globalStore').all('authConfig');

          return authConfigs.get('length') > 0;
        }
      },
    ],
  },
  {
    scope:          'global',
    id:             'global-tools',
    icon:           'tools-icon',
    localizedLabel: 'nav.tools.tab',
    submenu:        [
      {
        scope:          'global',
        id:             'global-catalogs',
        localizedLabel: 'nav.admin.catalogs',
        route:          'global-admin.catalog',
        resource:       ['catalog'],
        resourceScope:  'global',
        initExpand:     'global-admin.catalog'
      },
      {
        scope:          'global',
        id:             'nodes-node-drivers',
        localizedLabel: 'nav.admin.drivers',
        route:          'nodes.custom-drivers',
        resource:       ['nodedriver', 'kontainerdriver'],
        resourceScope:  'global',
        initExpand:     'nodes.custom-drivers.cluster-drivers'
      },
      {
        id:             'global-dns-entries',
        localizedLabel: 'nav.admin.globalDnsEntries',
        route:          'global-admin.global-dns.entries',
        resource:       ['globaldns'],
        resourceScope:  'global',
        initExpand:     'global-admin.global-dns.entries'
      },
      {
        id:             'global-dns-providers',
        localizedLabel: 'nav.admin.globalDnsProviders',
        route:          'global-admin.global-dns.providers',
        resource:       ['globaldnsprovider'],
        resourceScope:  'global',
        initExpand:     'global-admin.global-dns.providers'
      },
      {
        id:             'global-monitoring',
        localizedLabel: 'nav.admin.globalMonitoring',
        route:          'global-admin.global-monitoring',
        resourceScope:  'global',
        condition() {
          return !!get(this, 'access.admin');
        }
      },
      // {
      //   id:             'global-registry',
      //   localizedLabel: 'nav.admin.globalRegistry',
      //   route:          'global-admin.global-registry',
      //   // There is no schema for global registry. But we can use global dns to check if it is a HA env.
      //   resource:       ['globaldns'],
      //   resourceScope:  'global',
      // },
      {
        id:             'rke-template',
        localizedLabel: 'nav.admin.clusters.rkeTemplate',
        route:          'global-admin.cluster-templates',
        resource:       ['clustertemplate'],
        resourceScope:  'global',
        initExpand:     'global-admin.cluster-templates.index'
      },
    ],
  },
  {
    scope:          'global',
    id:             'global-audit-log',
    localizedLabel: 'nav.auditLog.tab',
    route:          'custom-extension.audit-log.index',
    icon:           'auditlog-icon',
    resourceScope:  'global',
    condition() {
      return !!(get(this, 'settings.asMap')['auditlog-server-url'] && get(this, 'settings.asMap')['auditlog-server-url']['value']);
    }
  },
//  {
//    scope: 'global',
//    id: 'global-advanced',
//    localizedLabel: 'nav.admin.settings.advanced',
//    route: 'global-admin.settings.advanced',
//    disabled: true,
//  },
]

export function initialize(/* appInstance*/) {
  bulkAdd(rootNav);
}

export default {
  name:       'nav-cn',
  initialize,
  after:      'store',
};
