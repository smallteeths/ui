import { inject as service } from '@ember/service';
import { get, set, computed, observer } from '@ember/object';
import Component from '@ember/component';
import layout from './template';
import {
  ARECORD, CNAME, ALIAS, WORKLOAD, SELECTOR, CLUSTERIP, UNKNOWN
} from 'ui/models/service';

const LOAD_BALANCER = 'LoadBalancer';
const NODE_PORT = 'NodePort';
const CLUSTER_IP = 'ClusterIP';
const HEADLESS = 'Headless';
const KIND_CHOICES = [
  {
    label: 'editDns.kind.headless',
    value: HEADLESS
  },
  {
    label: 'editDns.kind.clusterIP',
    value: CLUSTER_IP
  },
  {
    label: 'editDns.kind.loadBalancer',
    value: LOAD_BALANCER
  },
  {
    label: 'editDns.kind.nodePort',
    value: NODE_PORT
  },
]

export default Component.extend({
  intl:         service(),
  capabilities: service(),

  layout,
  model:   null,
  editing: true,

  timeoutSeconds: null,
  kindChoices:    null,

  init() {
    this._super(...arguments);

    if ( get(this, 'model.sessionAffinityConfig.clientIP.timeoutSeconds') ) {
      set(this, 'timeoutSeconds',  get(this, 'model.sessionAffinityConfig.clientIP.timeoutSeconds'));
    }

    this.initKindChoices();
    this.kindDidChange();
  },

  actions: {
    setAlias(ids) {
      set(this, 'model.targetDnsRecordIds', ids);
    },

    setWorkload(ids) {
      set(this, 'model.targetWorkloadIds', ids);
    },

    setSelector(map) {
      set(this, 'model.selector', map);
    },

    setLabels(labels) {
      let out = {};

      labels.forEach((row) => {
        out[row.key] = row.value;
      });

      set(this, 'model.labels', out);
    },
    removeService(service) {
      this.remove(service);
    }
  },

  timeoutSecondsDidChange: observer('timeoutSeconds', function() {
    const timeoutSeconds = get(this, 'timeoutSeconds');

    if ( !get(this, 'model.sessionAffinityConfig.clientIP.timeoutSeconds') ) {
      set(this, 'model.sessionAffinityConfig', { clientIP: { timeoutSeconds } })
    } else {
      set(this, 'model.sessionAffinityConfig.clientIP.timeoutSeconds', timeoutSeconds)
    }
  }),

  kindDidChange: observer('kind', function() {
    let kind = get(this, 'kind');

    if ( kind === HEADLESS ) {
      kind = CLUSTER_IP;
      set(this, 'model.clusterIp', 'None');
    } else if ( this.mode === 'new' ) {
      set(this, 'model.clusterIp', '');
      delete this.model.clusterIPs;
    }

    if ( kind === LOAD_BALANCER || kind === NODE_PORT ) {
      set(this, 'model.externalTrafficPolicy', 'Cluster');
    } else {
      set(this, 'model.externalTrafficPolicy', null);
    }

    set(this, 'model.kind', kind);
  }),

  showSessionAffinity: computed('isHeadless', 'kind', 'showMoreOptions', function() {
    return get(this, 'showMoreOptions') && get(this, 'kind') !== HEADLESS;
  }),

  showMoreOptions: computed('recordType', 'kind', function() {
    return CNAME !==  get(this, 'recordType');
  }),

  isHeadless: computed('kind', function() {
    return get(this, 'kind') === HEADLESS;
  }),
  recordType: computed(
    'model.ipAddresses.length',
    'model.hostname',
    'model.selector',
    'model.targetDnsRecordIds.length',
    'model.targetWorkloadIds.length',
    'model.clusterIp', function() {
      if ( get(this, 'model.ipAddresses.length')) {
        return ARECORD;
      }

      if ( get(this, 'model.hostname') ) {
        return CNAME;
      }

      if ( get(this, 'model.targetDnsRecordIds.length') ) {
        return ALIAS;
      }

      if ( get(this, 'model.targetWorkloadIds.length') ) {
        return WORKLOAD;
      }

      const selector = get(this, 'model.selector');

      if ( selector && Object.keys(selector).length ) {
        return SELECTOR;
      }

      if ( get(this, 'model.clusterIp') ) {
        return CLUSTERIP;
      }

      return UNKNOWN;
    }),

  initKindChoices() {
    const loadBalancerCapabilites = get(this, 'capabilities.loadBalancerCapabilites');

    if ( get(this, 'model.kind') === CLUSTER_IP && get(this, 'model.clusterIp') === null ) {
      set(this, 'kind', HEADLESS);
    } else if ( get(this, 'model.kind') ) {
      set(this, 'kind', get(this, 'model.kind'));
    }

    set(this, 'kindChoices', KIND_CHOICES.map((k) => {
      let disabled = false;

      if ( !loadBalancerCapabilites.l4LoadBalancerEnabled && get(k, 'value') === 'LoadBalancer' ) {
        disabled = true
      }

      let out = {
        label: get(k, 'label'),
        value: get(k, 'value'),
        disabled
      };

      return out;
    }));
  },
});
