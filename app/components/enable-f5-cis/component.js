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
import { compare as compareVersion } from 'ui/utils/parse-version';
import CatalogUpgrade from 'shared/mixins/catalog-upgrade';
import { all as PromiseAll } from 'rsvp';
import { parseHelmExternalId } from 'ui/utils/parse-externalid';

const EXPOSED_OPTIONS = [
  'bigip.password',
  'bigip.url',
  'bigip.username',
  'network.flannelName',
  'network.poolMemberType',
  'network.type',
  'partition',
  'ipam.enable',
  'ipam.volume.pvc',
];
const F5CIS_TEMPLATE = 'system-library-rancher-f5cis';

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

const ipv4RegExp = /^(((\d{1,2})|(1\d{2})|(2[0-4]\d)|(25[0-5]))\.){3}((\d{1,2})|(1\d{2})|(2[0-4]\d)|(25[0-5]))$/;
const ipv6RegExp = /^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/;

export default Component.extend(InputAnswers, CatalogUpgrade, {
  scope: service(),
  intl:  service(),

  layout,

  templateId:     F5CIS_TEMPLATE,
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
  currentVersion: null,
  ipam:           {
    enable:  false,
    volume:  { pvc: '' },
  },
  ipRanges: [],

  cluster:         alias('scope.currentCluster'),
  enabled:         alias('scope.currentCluster.enableF5CIS'),
  templateVersion: alias('versionConfig.defaultVersion'),
  valuesYaml:      alias('pastedAnswers'),

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
      set(params, 'version', get(this, 'templateVersion'));

      cluster.doAction(action, params).then(() => {
        if (this.isDestroyed || this.isDestroying) {
          return;
        }

        set(this, 'justDeployed', true);

        if ( action === 'editF5CIS' ) {
          this.send('upgrade');
        }

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
    },

    async upgrade() {
      const currentVersion = get(this, 'apps.firstObject.externalIdInfo.version') || get(this, 'currentVersion');
      const templateVersion = get(this, 'templateVersion');

      if ( !templateVersion || !currentVersion || templateVersion === currentVersion ) {
        return;
      }

      const requests = [];
      let apps = get(this, 'apps') || [];

      if (!apps.length){
        apps = await this.fetchApps();
      }

      apps.forEach((app) => {
        const externalInfo = parseHelmExternalId(get(app, 'externalId'));

        requests.push(get(this, 'globalStore').rawRequest({
          url:    `/v3/project/${ get(app, 'projectId') }/apps/${ get(app, 'id') }`,
          method: 'PUT',
          data:   {
            projectId:       get(app, 'projectId'),
            targetNamespace: get(app, 'targetNamespace'),
            externalId:      get(app, 'externalId')
              .replace(`version=${ get(externalInfo, 'version') }`, `version=${ templateVersion }`)
          }
        }));
      });

      return PromiseAll(requests);
    },

    addIPRange() {
      let ranges = get(this, 'ipRanges').slice();

      ranges.push({
        key:        '',
        rangeEnd:   '',
        rangeStart: '',
      });
      set(this, 'ipRanges', ranges);
    },

    removeIPRange(obj) {
      if (get(this, 'ipRanges.length') === 1){
        return;
      }
      const ranges = get(this, 'ipRanges').filter((r) => r !== obj);

      set(this, 'ipRanges', ranges);
    },
  },

  ipamEnable: observer('ipam.enable', function() {
    if (get(this, 'ipam.enable')){
      !get(this, 'ipRanges.length') && this.send('addIPRange');
    } else {
      set(this, 'ipRanges', []);
    }
  }),

  versionChoices: computed('enable', 'enabled', 'currentVersion', 'versionConfig.versionLinks', function() {
    const versionLinks = get(this, 'versionConfig.versionLinks') || [];
    const out = [];

    if (get(this, 'enabled') && get(this, 'currentVersion')){
      out.push({
        label: get(this, 'currentVersion'),
        value: get(this, 'currentVersion')
      })
      Object.keys(versionLinks).forEach((key) => {
        if (compareVersion(key, get(this, 'currentVersion')) > 0){
          out.push({
            label: key,
            value: key
          })
        }
      })
    } else {
      Object.keys(versionLinks).forEach((key) => {
        out.push({
          label: key,
          value: key
        })
      })
    }

    return out;
  }),

  networkTypeIsFlannel: computed('networkType', function() {
    return get(this, 'networkType') === 'flannel';
  }),

  latestVersion: computed('versionChoices.lastObject.value', function() {
    return get(this, 'versionChoices.lastObject.value')
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

    if ( get(this, 'pasteOrUpload') ) {
      return true;
    }

    if (get(this, 'ipam.enable') && get(this, 'ipRanges.length')){
      const keys = [];

      get(this, 'ipRanges').some((r) => {
        if (!r.key){
          errors.push(intl.t('f5CISPage.form.ipam.ipRange.keyError'));

          return true;
        }

        if (keys.includes(r.key)){
          errors.push(intl.t('f5CISPage.form.ipam.ipRange.repeatKeyError', { key: r.key }));

          return true;
        }

        keys.push(r.key);

        const ipv4TestStart = ipv4RegExp.test(r.rangeStart)
        const ipv4TestEnd = ipv4RegExp.test(r.rangeEnd)
        const ipv6TestStart = ipv6RegExp.test(r.rangeStart)
        const ipv6TestEnd = ipv6RegExp.test(r.rangeEnd)

        if (!((ipv4TestStart && ipv4TestEnd) || (ipv6TestStart && ipv6TestEnd))){
          errors.push(intl.t('f5CISPage.form.ipam.ipRange.IPFormatError', { key: r.key }));

          return true;
        }

        if (ipv4TestStart && this.comapreIP4(r.rangeStart, r.rangeEnd) > 0){
          errors.push(intl.t('f5CISPage.form.ipam.ipRange.IPRangeError', {
            min: r.rangeStart,
            max: r.rangeEnd,
            key: r.key,
          }));

          return true;
        }

        if (ipv6TestStart && this.comapreIP6(r.rangeStart, r.rangeEnd) > 0){
          errors.push(intl.t('f5CISPage.form.ipam.ipRange.IPRangeError', {
            min: r.rangeStart,
            max: r.rangeEnd,
            key: r.key
          }));

          return true;
        }
      })
    }

    if (get(this, 'ipam.enable') && !get(this, 'ipam.volume.pvc')){
      errors.push(intl.t('validation.required', { key: intl.t(`f5CISPage.form.ipam.volume.pvc.label`) }))
    }

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
        const currentVersion = get(res, 'version');
        const answers = {};
        const customAnswers = {};
        const ipRanges = []

        Object.keys(body || {}).forEach((key) => {
          if ( EXPOSED_OPTIONS.indexOf(key) > -1 ) {
            answers[key] = body[key];
          } else if (key.startsWith('ipam.ipRange.')) {
            const out = {}
            const k = key.substr(13);
            const range = body[key].split('-');

            out.key = k;
            out.rangeStart = range[0];
            out.rangeEnd = range[1];
            ipRanges.push(out);
          } else {
            customAnswers[key] = body[key];
          }
        });

        if (valuesYaml) {
          setProperties(this, {
            currentVersion,
            templateVersion: currentVersion,
            pasteOrUpload:   true,
            pastedAnswers:   valuesYaml,
            ipRanges,
          })
          this.parseYamlAnswers()
        } else {
          setProperties(this, {
            currentVersion,
            templateVersion: currentVersion,
            answers,
            customAnswers,
            ipRanges,
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
    set(this, 'ipam.enable', answers['ipam.enable'] === 'true');
    set(this, 'ipam.volume.pvc', answers['ipam.volume.pvc']);

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

    if (get(this, 'ipam.enable')){
      answers['ipam.enable'] = get(this, 'ipam.enable').toString();
      answers['ipam.volume.pvc'] = get(this, 'ipam.volume.pvc');

      if (get(this, 'ipRanges.length')){
        get(this, 'ipRanges').forEach((item) => {
          answers[`ipam.ipRange.${ item.key }`] = `${ item.rangeStart }-${ item.rangeEnd }`;
        })
      }
    }


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

  async fetchApps(){
    const store = get(this, 'globalStore');
    const cluster = get(this, 'cluster');
    const project = get(cluster, 'systemProject');

    if ( project && get(cluster, 'enableF5CIS') ) {
      const res = await store.rawRequest({
        url:    `/v3/project/${ get(project, 'id') }/apps`,
        method: 'GET',
      });

      const apps = get(res, 'body.data') || [];
      const clusterApp = apps.findBy('name', 'cluster-f5cis');

      return [clusterApp];
    }

    return [];
  },

  comapreIP4(ipBegin, ipEnd) {
    const begin = ipBegin.split('.');
    const end = ipEnd.split('.');

    for (let i = 0;i < 4;i++) {
      if (parseInt(begin[i], 10) > parseInt(end[i], 10)) {
        return 1;
      } else if (parseInt(begin[i], 10) < parseInt(end[i], 10)) {
        return -1;
      }
    }

    return 0;
  },
  convert2CompleteIpV6(ip) {
    let ipV6 = ip
    const index = ip.indexOf('::')

    if (index > 0) {
      const size = 8 - (ip.split(':').length - 1)
      let tmp = ''

      for (let i = 0; i < size; i++) {
        tmp += ':0'
      }
      tmp += ':'
      ipV6 = ip.replace('::', tmp)
    } else if (index === 0) {
      ipV6 = ip.replace('::', '0:0:0:0:0:0:0:')
    }

    return ipV6
  },
  comapreIP6(ipBegin, ipEnd) {
    ipBegin = this.convert2CompleteIpV6(ipBegin)
    ipEnd = this.convert2CompleteIpV6(ipEnd)
    const ipBegins = ipBegin.split(':')
    const ipEnds = ipEnd.split(':')

    for (let i = 0; i < ipBegins.length; i++) {
      if (ipBegins[i] === '') {
        if (ipEnds[i] === '') {
          continue
        } else {
          return -1
        }
      } else {
        if (ipEnds[i] === '') {
          return 1
        } else {
          const value1 = parseInt(ipBegins[i], 16)
          const value2 = parseInt(ipEnds[i], 16)

          if (value1 > value2) {
            return 1
          } else if (value1 < value2) {
            return -1
          } else {
            continue
          }
        }
      }
    }
  },
});
