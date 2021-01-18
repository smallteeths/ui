import { inject as service } from '@ember/service';
import { on } from '@ember/object/evented';
import { later } from '@ember/runloop';
import Component from '@ember/component';
import {
  set, get, computed, observer, setProperties
} from '@ember/object';
import { alias } from '@ember/object/computed';
import layout from './template';


const NETWORK_TYPE_CHOISES = [
  {
    label: 'Flannel',
    value: 'Flannel'
  }
]

const POOL_MEMBER_TYPE_CHOISES = [
  {
    label: 'Cluster',
    value: 'Cluster'
  },
  {
    label: 'NodePort',
    value: 'NodePort'
  },
]

export default Component.extend({
  scope: service(),
  intl:  service(),

  layout,

  answers:        null,
  justDeployed:   false,
  confirmDisable: false,
  errors:         [],

  networkTypeChoises:    NETWORK_TYPE_CHOISES,
  poolMemberTypeChoises: POOL_MEMBER_TYPE_CHOISES,

  networkType: 'Flannel',
  memberType:  'Cluster',

  cluster: alias('scope.currentCluster'),
  version: alias('versionConfig.defaultVersion'),

  actions: {
    promptDisable() {
      set(this, 'confirmDisable', true);
      later(this, function() {
        if (this.isDestroyed || this.isDestroying) {
          return;
        }
        set(this, 'confirmDisable', false);
      }, 10000);
    },

    enable(cb) {
      const valid = this.validate();

      if (!valid) {
        return cb(false);
      }

      const cluster = get(this, 'cluster');
      const answers = this.updateAnswers();
      let action = get(this, 'enabled') ?  'editF5CIS' : 'enableF5CIS';
      const params = {};

      set(params, 'answers', answers);
      set(params, 'version', get(this, 'version'));

      cluster.doAction(action, params).then(() => {
        if (this.isDestroyed || this.isDestroying) {
          return;
        }

        set(this, 'justDeployed', true);
        cb(true);
        this.fetchSettings();
      }).catch(() => {
        cb(false);
      });
    },

    disable() {
      const cluster = get(this, 'cluster');

      cluster.doAction('disableF5CIS').then(() => {
        if (this.isDestroyed || this.isDestroying) {
          return;
        }

        setProperties(this, {
          answers: null,
          version: get(this, 'versionConfig.defaultVersion'),
        })
      })
    },
  },

  enabled: computed('cluster.enableF5CIS', function() {
    return get(this, 'cluster.enableF5CIS');
  }),

  versionChoices: computed('versionConfig.versionLinks', function() {
    const versionLinks = get(this, 'versionConfig.versionLinks') || [];
    const out = [];

    Object.keys(versionLinks).forEach((key) => {
      out.push({
        label: key,
        value: key
      })
    })

    return out;
  }),

  networkTypeIsFlannel: computed('networkType', function() {
    return get(this, 'networkType') === 'Flannel';
  }),

  initSettings: on('init', observer('scope.currentProject.id', 'scope.currentCluster.id', function() {
    if ( get(this, 'enabled') ) {
      this.fetchSettings();
    }
  })),

  validate() {
    const intl = get(this, 'intl');
    const fields = ['url', 'partition', 'username', 'password'];
    const errors = [];

    fields.forEach((f) => {
      if (!get(this, f) || get(this, f).trim() === '') {
        errors.push(intl.t('validation.required', { key: intl.t(`f5CISPage.form.${ f }.label`) }))
      }
    });

    setProperties(this, { errors });

    return errors.length === 0;
  },

  fetchSettings() {
    const cluster = get(this, 'cluster');

    if ( !cluster ) {
      return;
    }

    set(this, 'loading', true);
    cluster.waitForAction('viewF5CIS').then(() => {
      if (this.isDestroyed || this.isDestroying) {
        return;
      }

      cluster.doAction('viewF5CIS').then((res) => {
        if (this.isDestroyed || this.isDestroying) {
          return;
        }

        const body = get(res, 'answers');
        const version = get(res, 'version');
        const answers = {};

        Object.keys(body || {}).forEach((key) => {
          answers[key] = body[key];
        });

        setProperties(this, {
          answers,
          version
        });
        this.updateConfig(answers);

        set(this, 'loading', false);
      }).catch(() => {
        set(this, 'loading', false);
      });
    })
  },

  updateConfig(answers) {
    set(this, 'url', answers['bigip.url']);
    set(this, 'partition', answers['partition']);
    set(this, 'username', answers['bigip.username']);
    set(this, 'password', answers['bigip.password']);
    set(this, 'networkType', answers['network.type']);
    set(this, 'poolMemberType', answers['network.poolMemberType']);

    if (this.networkType === 'Flannel') {
      set(this, 'flannelName', answers['network.flannelName']);
    }
  },

  updateAnswers() {
    let answers = {};

    answers['bigip.url'] = get(this, 'url');
    answers['partition'] = get(this, 'partition');
    answers['bigip.username'] = get(this, 'username');
    answers['bigip.password'] = get(this, 'password');
    answers['network.type'] = get(this, 'networkType');
    answers['network.poolMemberType'] = get(this, 'poolMemberType');

    if (this.networkTypeIsFlannel) {
      answers['network.flannelName'] = get(this, 'flannelName')
    } else {
      answers['network.flannelName'] && delete answers['network.flannelName']
    }

    return answers
  },

});
