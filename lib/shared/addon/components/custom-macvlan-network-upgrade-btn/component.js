import Component from '@ember/component';
import layout from './template';
import { get, set, computed } from '@ember/object';
import { inject as service } from '@ember/service';

export default Component.extend({
  modalService: service('modal'),

  layout,

  cluster:           null,
  networkPlugin:     null,
  networkOptions:    null,
  networkPluginName: null,

  status: '', // current, available, loading, sendingUpgradeRequest

  didInsertElement() {
    this._super(...arguments);
    if (this.isMacVlanNetwork) {
      this.checkNetworkAddons();
    }
  },

  actions: {
    showConfirmModal() {
      get(this, 'modalService').toggleModal('custom-modal-confirm-upgrade-network-addons', {
        cluster:       this.cluster,
        networkPlugin: this.networkPluginName,
        upgrade:       () => {
          this.updateNetworkAddons();
        }
      });
    },
  },

  isMacVlanNetwork: computed('networkPlugin', 'networkOptions', function() {
    let plugin = this.networkPlugin;
    const pandariaExtraPluginName = get(this, 'networkOptions.pandariaExtraPluginName');

    if (plugin === 'none' && pandariaExtraPluginName) {
      plugin = pandariaExtraPluginName;
    }

    return ['multus-flannel-macvlan', 'multus-canal-macvlan'].indexOf(plugin) > -1;
  }),

  checkNetworkAddons() {
    set(this, 'status', 'loading');
    this.cluster.doAction('checkNetworkAddons').then((resp) => {
      set(this, 'status', resp.needUpdate ? 'available' : 'current');
    }).catch((err) => {
      console.warn(err);
      set(this, 'status', 'current');
    });
  },

  updateNetworkAddons() {
    set(this, 'status', 'sendingUpgradeRequest');
    this.cluster.doAction('refreshNetworkAddons').finally(() => {
      this.checkNetworkAddons();
    });
  },
});
