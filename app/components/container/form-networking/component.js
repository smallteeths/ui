import { get, set, computed, observer } from '@ember/object';
import Component from '@ember/component';
import layout from './template';
import { inject as service } from '@ember/service';
import { htmlSafe } from '@ember/string';

const DUAL_NETWORK_CARD = '[{"name":"static-macvlan-cni-attach","interface":"eth1"}]';
const SINGLE_NETWORK_CARD = '[{"name":"static-macvlan-cni-attach","interface":"eth0"}]';

const MACVLAN_ANNOTATION_MAP = {
  network:  'k8s.v1.cni.cncf.io/networks',
  network0: 'v1.multus-cni.io/default-network',
  ip:       'macvlan.pandaria.cattle.io/ip',
  mac:      'macvlan.pandaria.cattle.io/mac',
  subnet:   'macvlan.pandaria.cattle.io/subnet'
};

export default Component.extend({
  scope:      service(),
  vlansubnet: service(),

  layout,

  // Inputs
  instance: null,
  service:  null,
  errors:   null,
  editing:  null,

  scaleMode:  null,
  // static pod
  staticPod:    false,

  staticPodForm: {
    network: DUAL_NETWORK_CARD,
    ip:      '',
    mac:     '',
    subnet:    '',
  },

  interfaces: [{
    label: 'eth1',
    value: DUAL_NETWORK_CARD,
  }, {
    label: 'eth0',
    value: SINGLE_NETWORK_CARD,
  }],
  vlansubnets:          [],
  // unsupport vlansubnet
  unsupportVlansubnet:  true,

  initHostAliasesArray: [],
  initOptionsArray:     [],

  classNames: ['accordion-wrapper'],

  init() {
    this._super(...arguments);
    this.initHostAliases();
    this.initOptions();
    this.initStaticPod();
  },

  actions: {
    updateStaticPod() {
      const annotationsForm = get(this, 'staticPodForm');
      const annotations = get(this, 'service.annotations');
      const props = Object.values(MACVLAN_ANNOTATION_MAP);
      const propMap = Object.assign({}, MACVLAN_ANNOTATION_MAP);

      if (!get(this, 'enableStaticPod')) {
        if (annotations) {
          const form = {};

          Object.keys(annotations).forEach((a) => {
            if (props.indexOf(a) < 0) {
              form[a] = annotations[a];
            }
          });
          form['macvlan.panda.io/macvlanService'] = 'disable';
          set(this, 'service.annotations', Object.assign({}, form));
        }

        return;
      }
      const { network, subnet } = annotationsForm;

      if (network && subnet) {
        const form = {};

        Object.keys(annotationsForm).forEach((a) => {
          if (a === 'network') {
            form[propMap[`${ annotationsForm[a] === DUAL_NETWORK_CARD ? a : `${ a }0` }`]] = annotationsForm[a];
          } else {
            form[propMap[a]] = annotationsForm[a];
          }
          if ((a === 'ip' || a === 'mac') && annotationsForm[a] === '') {
            form[propMap[a]] = 'auto';
          }
          if ((a === 'ip' || a === 'mac') && annotationsForm[a] !== '') {
            const v = annotationsForm[a].split(/,|，/);

            // const macAddrReg =  /[A-Fa-f0-9]{2}:[A-Fa-f0-9]{2}:[A-Fa-f0-9]{2}:[A-Fa-f0-9]{2}:[A-Fa-f0-9]{2}:[A-Fa-f0-9]{2}/;
            // const ipv4Reg = /^(((\d{1,2})|(1\d{2})|(2[0-4]\d)|(25[0-5]))\.){3}((\d{1,2})|(1\d{2})|(2[0-4]\d)|(25[0-5]))$/;
            form[propMap[a]] = v.join('-');
          }
        });
        if (annotations) {
          delete annotations['macvlan.panda.io/macvlanService'];
          delete annotations[MACVLAN_ANNOTATION_MAP.network];
          delete annotations[MACVLAN_ANNOTATION_MAP.network0];
        }
        set(this, 'service.annotations', Object.assign({}, annotations || {}, form));

        return;
      }
    },

    hostAliasesChanged(hostAliases) {
      const out = [];

      hostAliases.filter((alias) => alias.value && alias.key).forEach((alias) => {
        out.push({
          hostnames: [alias.value],
          ip:        alias.key,
        });
      });
      set(this, 'service.hostAliases', out);
    },

    optionsChanged(options) {
      const out = [];

      options.forEach((option) => {
        out.push({
          name:  get(option, 'key'),
          value: get(option, 'value'),
        });
      });

      const dnsConfig = get(this, 'service.dnsConfig');

      if ( !dnsConfig ) {
        set(this, 'service.dnsConfig', { options: out });
      } else {
        set(this, 'service.dnsConfig.options', out);
      }
    },

    updateNameservers(nameservers) {
      const dnsConfig = get(this, 'service.dnsConfig');

      if ( !dnsConfig ) {
        set(this, 'service.dnsConfig', { nameservers });
      } else {
        set(this, 'service.dnsConfig.nameservers', nameservers);
      }
    },

    updateSearches(searches) {
      const dnsConfig = get(this, 'service.dnsConfig');

      if ( !dnsConfig ) {
        set(this, 'service.dnsConfig', { searches });
      } else {
        set(this, 'service.dnsConfig.searches', searches);
      }
    }
  },

  staticPodDidChanged: observer('staticPod', function() {
    if (!get(this, 'staticPod')) {
      const annotations = get(this, 'service.annotations') || {};
      const props = Object.values(MACVLAN_ANNOTATION_MAP);
      const form = {}

      Object.keys(annotations).forEach((a) => {
        if (props.indexOf(a) < 0) {
          form[a] = annotations[a];
        }
      });
      form['macvlan.panda.io/macvlanService'] = 'disable';
      set(this, 'service.annotations', form);
      this.sendAction('toggleMacvlan', get(this, 'staticPod'));

      return;
    }
    this.send('updateStaticPod');
    this.sendAction('toggleMacvlan', get(this, 'staticPod'));
  }),

  macvlanNetworkAnnotationDidChanged: observer('staticPodForm.network', 'enableStaticPod', function() {
    const annotations = get(this, 'service.annotations');

    if (annotations) {
      if (!get(this, 'enableStaticPod')) {
        delete annotations[MACVLAN_ANNOTATION_MAP.network];
        delete annotations[MACVLAN_ANNOTATION_MAP.network0];

        return;
      }
      delete annotations[MACVLAN_ANNOTATION_MAP.network];
      delete annotations[MACVLAN_ANNOTATION_MAP.network0];
      if (get(this, 'staticPodForm.network') === DUAL_NETWORK_CARD) {
        annotations[MACVLAN_ANNOTATION_MAP.network] = DUAL_NETWORK_CARD
      } else {
        annotations[MACVLAN_ANNOTATION_MAP.network0] = SINGLE_NETWORK_CARD
      }
    }
  }),

  isStopFirstChange: computed('service.deploymentConfig.maxSurge', 'scaleMode', function() {
    if ( get(this, 'scaleMode') !== 'deployment') {
      return false
    }

    const config = get(this, 'service.deploymentConfig');
    let  maxSurge = get(config, 'maxSurge');
    let  maxUnavailable = get(config, 'maxUnavailable');
    let  actualStrategy = get(config, 'strategy');

    if ( actualStrategy === 'RollingUpdate' ) {
      if ( maxSurge && maxUnavailable ) {
        return false
      } else if ( maxSurge ) {
        return false
      } else if ( maxUnavailable ) {
        return true
      } else {
        return false
      }
    }

    if ( actualStrategy === 'Recreate' ) {
      return false
    }

    return;
  }),
  staticPodAnnotation: computed('service.annotations', function() {
    const annotations = get(this, 'service.annotations') || {};

    return {
      network: annotations[MACVLAN_ANNOTATION_MAP.network] || annotations[MACVLAN_ANNOTATION_MAP.network0],
      ip:      (annotations[MACVLAN_ANNOTATION_MAP.ip] || '').split('-').join(','),
      mac:     (annotations[MACVLAN_ANNOTATION_MAP.mac] || '').split('-').join(','),
      subnet:  annotations[MACVLAN_ANNOTATION_MAP.subnet],
    }
  }),
  enableStaticPod: computed('service.annotations', 'staticPod', 'editing', function() {
    const {
      [MACVLAN_ANNOTATION_MAP.network]: network, [MACVLAN_ANNOTATION_MAP.network0]: network0, [MACVLAN_ANNOTATION_MAP.ip]:ip, [MACVLAN_ANNOTATION_MAP.subnet]:subnet
    } = get(this, 'service.annotations') || {};

    if (get(this, 'editing')) {
      return get(this, 'staticPod')
    }
    if ((network || network0) && ip && subnet) {
      return true;
    }

    return false;
  }),
  enableStaticPodLabel: computed('enableStaticPod', function() {
    if (get(this, 'enableStaticPod')) {
      return '启用';
    }

    return '禁用';
  }),
  vlansubnetdisabledStyle: computed('unsupportVlansubnet', function() {
    if (get(this, 'unsupportVlansubnet')) {
      return htmlSafe('color: #8b969d;cursor: not-allowed;');
    }

    return htmlSafe('');
  }),
  netInterface: computed('staticPodForm.network', function() {
    let netInterface = get(this, 'staticPodForm.network');

    if (netInterface) {
      try {
        netInterface = (JSON.parse(netInterface) || [{ interface: 'eth1' }])[0].interface;
      } catch (err) {
        // ignore err
      }
    }

    return netInterface;
  }),
  loadVlansubnets() {
    const clusterId = get(this, 'scope.currentCluster.id');

    if (clusterId) {
      const project = get(this, 'scope.currentProject');

      get(this, 'vlansubnet').fetchVlansubnets(clusterId, { labelSelector: encodeURIComponent(`project in (${ project.id.replace(/[:]/g, '-') }, )`) }).then((resp) => {
        const items = resp.body.items.map((item) => ({
          label: `${ item.metadata.name }(${ item.spec.cidr })`,
          value: item.metadata.name
        }));

        set(this, 'vlansubnets', items);
        set(this, 'unsupportVlansubnet', false);
      }).catch(() => {});
    }
  },

  initHostAliases() {
    const aliases = get(this, 'service.hostAliases');

    set(this, 'initHostAliasesArray', []);
    (aliases || []).forEach((alias) => {
      (alias.hostnames || []).forEach((hostname) => {
        this.initHostAliasesArray.push({
          key:   alias.ip,
          value: hostname,
        });
      })
    });
  },

  initOptions() {
    const options = get(this, 'service.dnsConfig.options');

    set(this, 'initOptionsArray', []);
    (options || []).forEach((option) => {
      this.initOptionsArray.push({
        key:   get(option, 'name'),
        value: get(option, 'value'),
      });
    });
  },
  initStaticPod() {
    const {
      [MACVLAN_ANNOTATION_MAP.network]: network, [MACVLAN_ANNOTATION_MAP.network0]: network0, [MACVLAN_ANNOTATION_MAP.ip]:ip, [MACVLAN_ANNOTATION_MAP.subnet]:subnet, [MACVLAN_ANNOTATION_MAP.mac]:mac
    } = get(this, 'service.annotations') || {};

    if ((network || network0) && subnet) {
      set(this, 'staticPodForm', {
        network: network || network0,
        ip:      ip === 'auto' ? '' : ip.split('-').join(','),
        mac:     mac === 'auto' ? '' : mac.split('-').join(','),
        subnet,
      });
      set(this, 'staticPod', true);
    } else {
      set(this, 'staticPodForm', {
        network: DUAL_NETWORK_CARD,
        ip:      '',
        mac:     '',
        subnet:  '',
      });
      set(this, 'staticPod', false);
    }
    this.loadVlansubnets();
  }
});
