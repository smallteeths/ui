import Component from '@ember/component';
import layout from './template';
import { equal/* , alias, or */ } from '@ember/object/computed';
import {
  computed,
  get,
  set,
  setProperties,
  observer
} from '@ember/object';
import { randomStr } from 'shared/utils/util';
import { inject as service } from '@ember/service';
import { gte, major, minor }  from 'semver';
import { coerceVersion } from 'shared/utils/parse-version';
import C from 'shared/utils/constants';

const NETWORKCHOICES = [
  {
    label: 'clusterNew.rke.network.flannel',
    value: 'flannel'
  },
  {
    label: 'clusterNew.rke.network.calico',
    value: 'calico'
  },
  {
    label: 'clusterNew.rke.network.canal',
    value: 'canal'
  },
  {
    label: 'clusterNew.rke.network.weave',
    value: 'weave'
  },
  {
    label: 'clusterNew.rke.network.multusFlannel',
    value: 'multus-flannel-macvlan'
  },
  {
    label: 'clusterNew.rke.network.multusCanal',
    value: 'multus-canal-macvlan'
  },
];

const {
  FLANNEL,
  CANAL,
  WEAVE,
  VXLAN,
  DEFAULT_BACKEND_TYPE,
  BACKEND_PORT,
  BACKEND_VNI,
  MULTUS_CANAL,
} = C.NETWORK_CONFIG_DEFAULTS;

const MIN_K8S_FOR_WINDOWS_SUPPORT = 'v1.15.0';

export default Component.extend({
  globalStore:             service(),
  intl:                    service(),
  layout,

  networkContent:          NETWORKCHOICES,
  mode:                    'new',
  isCustom:                false,
  config:                  null,
  enableNetworkPolicy:     null,
  clusterTemplateRevision: null,
  applyClusterTemplate:    null,
  nodeWhich:               null,
  kubernetesVersion:       null,

  windowsSupportOverrideAvailable: false,

  isEdit:                  equal('mode', 'edit'),

  init() {
    this._super(...arguments);

    this.setFlannelLables();
  },

  windowsSupportAvailableDidChange: observer('windowsSupportAvailable', function() {
    if ( !get(this, 'windowsSupportAvailable') ) {
      set(this, 'cluster.windowsPreferedCluster', false);
    }
  }),

  windowsSupportChange: observer('cluster.windowsPreferedCluster', function() {
    if ( this.mode === 'edit' ) {
      return;
    }

    const windowsSupport = get(this, 'cluster.windowsPreferedCluster')
    const config = get(this, 'config')

    if ( !config ) {
      return;
    }

    if (windowsSupport) {
      set(config, 'network.options.flannel_backend_type', VXLAN)
    } else {
      set(config, 'network.options.flannel_backend_type', DEFAULT_BACKEND_TYPE)
    }
  }),

  flannelBackendDidChange: observer('cluster.windowsPreferedCluster', 'config.network.plugin', 'config.network.options.flannel_backend_type', function() {
    const config         = get(this, 'config');

    if (config) {
      const plugin         = get(config, 'network.plugin');
      const flannelBackend = get(config, 'network.options.flannel_backend_type');
      const windowsSupport = get(this, 'cluster.windowsPreferedCluster');

      if ( flannelBackend === VXLAN && plugin === FLANNEL && windowsSupport ) {
        setProperties(config, {
          'network.options.flannel_backend_port': BACKEND_PORT,
          'network.options.flannel_backend_vni':  BACKEND_VNI
        })
      } else {
        const options = get(config, 'network.options');

        delete options['flannel_backend_port'];
        delete options['flannel_backend_vni'];
      }
    }
  }),

  networkPluginDidChange: observer('config.network.plugin', function() {
    let plugin = get(this, 'config.network.plugin');

    if (plugin) {
      if (plugin !== CANAL) {
        set(this, 'enableNetworkPolicy', false);
      }

      if (plugin === WEAVE) {
        set(this, 'config.network.weaveNetworkProvider', this.globalStore.createRecord({
          type:     'weaveNetworkProvider',
          password: randomStr(16, 16, 'password')
        }));
      } else if (plugin !== WEAVE && get(this, 'config.network.weaveNetworkProvider.password')) {
        set(this, 'config.network.weaveNetworkProvider', null);
      }
    }
  }),

  unsupportedMacvlanDidChange: observer('unsupportedMacvlan', function() {
    const p = get(this, 'config.network.plugin');

    if (get(this, 'unsupportedMacvlan') && ['multus-flannel-macvlan', 'multus-canal-macvlan'].indexOf(p) > -1) {
      set(this, 'config.network.plugin', get(this, 'networkPluginArr.firstObject.value'));
    }
  }),

  windowsSupportAvailable: computed('config.network.plugin', 'config.kubernetesVersion', function() {
    const plugin = get(this, 'config.network.plugin');

    const kubernetesVersion = get(this, 'config.kubernetesVersion');

    return plugin === FLANNEL && gte(coerceVersion(kubernetesVersion), MIN_K8S_FOR_WINDOWS_SUPPORT);
  }),

  projectNetworkIsolationAvailable: computed('config.network.plugin', function() {
    const plugin = get(this, 'config.network.plugin');

    // return plugin === CANAL;
    return [CANAL, MULTUS_CANAL].indexOf(plugin) > -1
  }),

  unsupportedMacvlan: computed('nodeWhich', 'kubernetesVersion', function() {
    const macVlanPlugin = ['openstack', 'vmwarevsphere', 'custom'];
    const hasMacVlanFlag = macVlanPlugin.indexOf(get(this, 'nodeWhich')) > -1;
    const kubernetesVersion = get(this, 'kubernetesVersion');

    return !hasMacVlanFlag || (kubernetesVersion && major(kubernetesVersion) === 1 && minor(kubernetesVersion) <= 13);
  }),

  networkPluginArr: computed('unsupportedMacvlan', function() {
    if (get(this, 'unsupportedMacvlan')) {
      return get(this, 'networkContent').filter((item) => {
        return item.value !== 'multus-flannel-macvlan' && item.value !== 'multus-canal-macvlan'
      });
    }

    return get(this, 'networkContent')
  }),

  configNetworkPluginDisplayName: computed('config.network.plugin', 'networkPluginArr', 'intl.locale', function() {
    let plugin = get(this, 'config.network.plugin');
    const networkOptions = get(this, 'config.network.options');
    const pandariaExtraPluginName = networkOptions && networkOptions['pandariaExtraPluginName'];

    if (plugin === 'none' && pandariaExtraPluginName) {
      plugin = pandariaExtraPluginName;
    }
    const pluginOpt = get(this, 'networkPluginArr').findBy('value', plugin)

    if (pluginOpt) {
      return get(this, 'intl').t(pluginOpt.label);
    }

    return plugin
  }),

  showMTU: computed('config.network.plugin', 'networkPluginArr', function() {
    const hideValueArr            = ['flannel', 'multus-flannel-macvlan', 'multus-canal-macvlan'];
    const plugin                  = get(this, 'config.network.plugin');

    return hideValueArr.indexOf(plugin) === -1
  }),

  setFlannelLables() {
    let flannel = this.networkContent.findBy('value', 'flannel');

    if (get(this, 'isCustom')) {
      set(flannel, 'label', 'clusterNew.rke.network.flannelCustom');
    } else {
      set(flannel, 'label', 'clusterNew.rke.network.flannel');
    }
  },
});
