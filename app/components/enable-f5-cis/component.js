import { inject as service } from '@ember/service';
import { on } from '@ember/object/evented';
import { later } from '@ember/runloop';
import Component from '@ember/component';
import {
  set, get, computed, observer, setProperties
} from '@ember/object';
import { alias } from '@ember/object/computed';
import { convertDotAnswersToBoolYaml } from 'shared/utils/convert-yaml';
import jsyaml from 'js-yaml';
import flatMap, { isEmptyObject, isObject } from 'shared/utils/flat-map';
import layout from './template';
import InputAnswers from 'shared/mixins/input-answers';

const EXPOSED_OPTIONS = [
  'bigip.password',
  'bigip.url',
  'bigip.username',
  'network.flannelName',
  'network.poolMemberType',
  'network.type',
  'partition'
];

const NETWORK_TYPE_CHOISES = [
  {
    label: 'Flannel + Rancher Macvlan',
    value: 'flannel'
  }
];

const POOL_MEMBER_TYPE_CHOISES = [
  {
    label: 'Cluster',
    value: 'cluster'
  },
  {
    label: 'NodePort',
    value: 'nodeport'
  },
];

export default Component.extend(InputAnswers, {
  scope: service(),
  intl:  service(),

  layout,

  answers:        null,
  customAnswers:  null,
  justDeployed:   false,
  confirmDisable: false,
  errors:         [],

  networkTypeChoises:    NETWORK_TYPE_CHOISES,
  poolMemberTypeChoises: POOL_MEMBER_TYPE_CHOISES,

  poolMemberType: 'cluster',
  networkType:    'flannel',
  url:            '',
  partition:      '',
  username:       '',
  password:       '',

  cluster:    alias('scope.currentCluster'),
  version:    alias('versionConfig.defaultVersion'),
  valuesYaml: alias('pastedAnswers'),

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

      const { valuesYaml, pasteOrUpload } = this

      if (pasteOrUpload) {
        set(params, 'valuesYaml', valuesYaml)
      } else {
        set(params, 'answers', answers)
      }

      // set(params, 'answers', answers);
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
          answers:       null,
          customAnswers: null,
          version:       get(this, 'versionConfig.defaultVersion'),
        })
      })
    },

    showPaste() {
      const answers = this.updateAnswers()
      const yaml = convertDotAnswersToBoolYaml(answers);

      setProperties(this, {
        pastedAnswers: yaml,
        pasteOrUpload: true,
      })
    },

    cancel() {
      this.parseYamlAnswers();
      this.filterMissingAnswer();
    }
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
    return get(this, 'networkType') === 'flannel';
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

        const { valuesYaml } = res
        const body = get(res, 'answers');
        const version = get(res, 'version');
        const answers = {};
        const customAnswers = {};

        Object.keys(body || {}).forEach((key) => {
          if ( EXPOSED_OPTIONS.indexOf(key) > -1 ) {
            answers[key] = body[key];
          } else {
            customAnswers[key] = body[key];
          }
        });

        if (valuesYaml) {
          setProperties(this, {
            version,
            pasteOrUpload: true,
            pastedAnswers: valuesYaml,
          })
          this.parseYamlAnswers()
        } else {
          setProperties(this, {
            version,
            answers,
            customAnswers,
          })
          this.updateConfig(answers);
        }

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

    if (this.networkType === 'flannel') {
      set(this, 'poolMemberType', answers['network.poolMemberType']);
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

    if (this.networkTypeIsFlannel) {
      answers['network.poolMemberType'] = get(this, 'poolMemberType');

      if (this.poolMemberType === 'cluster') {
        answers['network.flannelName'] = get(this, 'flannelName');
      }
    }

    const customAnswers = get(this, 'customAnswers') || {};

    Object.keys(customAnswers).forEach((key) => {
      answers[key] = customAnswers[key]
    });

    return answers
  },

  parseYamlAnswers() {
    let { valuesYaml } = this;
    let parsedYaml     = null;

    try {
      parsedYaml = jsyaml.safeLoad(valuesYaml);
    } catch ( err ) {
      set(this, 'yamlErrors', [`YAML Parse Error: ${ err.snippet } - ${ err.message }`]);
    }

    if (parsedYaml) {
      let answers = flatMap(parsedYaml);

      this.updateConfig(answers)

      const customAnswerKeys = Object.keys(answers).filter((a = '') => {
        const filter = EXPOSED_OPTIONS.filter((q) => a.startsWith(q))

        if (get(filter, 'length') > 0) {
          return false
        } else {
          return true
        }
      })

      const customAnswers = {}

      customAnswerKeys.map((key) => {
        customAnswers[key] = answers[key]
      })

      set(this, 'customAnswers', customAnswers)
    }
  },

  filterMissingAnswer() {
    const customAnswers = get(this, 'customAnswers') || {}

    const missingKeys = Object.keys(customAnswers).map((key) => {
      const value = customAnswers[key]

      if (isObject(value) && isEmptyObject(value)) {
        return key
      }
    }).filter((m) => m)

    if (missingKeys.length > 0) {
      let newCustomAnswers = {}

      Object.keys(customAnswers).map((key) => {
        if (!missingKeys.includes(key)) {
          newCustomAnswers[key] = customAnswers[key]
        }
      })

      set(this, 'customAnswers', newCustomAnswers)

      this.modalService.toggleModal('modal-confirm-yaml-switch', {
        finish:                  this.finishBackToForm.bind(this),
        propertiesGoingToBeLost: missingKeys.map((key) => {
          return {
            lostKey:   key,
            lostValue: '{}'
          }
        }),
      })
    } else {
      this.finishBackToForm()
    }
  },

});
