import { alias } from '@ember/object/computed';
import Component from '@ember/component';
import ModalBase from 'shared/mixins/modal-base';
import { get, set } from '@ember/object'
import { inject as service } from '@ember/service';
import layout from './template';
import jsyaml from 'js-yaml';

export default Component.extend(ModalBase, {
  globalStore:      service(),
  growl:       service(),
  intl:        service(),

  layout,
  classNames: ['large-modal'],
  saving:     false,
  tmpl:       '',
  tmplByUser: '',
  enabled:    true,
  errors:     null,
  namespace:  'cattle-global-data',
  default:    `<rule-name>: |- \n  displayName: "<display rule name for user>" \n  metricRule:  \n    comparison: "<operator>" \n    expression: "<expression for rules>"\n    duration: "<duration for call alert, e.g. 1m, 30s>" \n    thresholdValue: "< value for trigger the alert>" \n    description: "<description for this rule>"`,

  kind:     alias('modalService.modalOpts.kind'),
  callback: alias('modalService.modalOpts.callback'),

  init() {
    this._super(...arguments);

    set(this, 'tmpl', this.default)

    if (this.kind && this.namespace){
      this.getMetricRuleTemplate();
    }
  },

  actions: {
    save() {
      const errors = [];
      let kind = this.kind;
      let ruleLength = 0;

      try {
        const parsedYaml = jsyaml.load(this.tmplByUser) || {};

        ruleLength = Object.keys(get(parsedYaml, 'data') || {}).length;
        kind = get(parsedYaml, 'metadata.name') || this.kind;

        if (ruleLength > 100){
          errors.push(this.intl.t('alertPage.newOrEdit.templateRules.maxError', { total: ruleLength }));
        }
      } catch (error) {
        errors.push(error?.message || error)
      }
      const header = 'apiVersion: v1\ndata: \n';
      const footer = `kind: ConfigMap \nmetadata: \n name: ${ kind } \n namespace: cattle-global-data`;

      if (errors.length){
        set(this, 'saving', false);
        set(this, 'errors', errors);

        return;
      }

      get(this, 'globalStore').rawRequest({
        url:     `/v3/clusters/local?action=importYaml`,
        method:  'POST',
        data:   {
          namespace: this.namespace,
          yaml:      this.tmplByUser || `${ header }${ footer }`,
        }
      }).then(() => {
        this.growl.success(kind, this.intl.t('alertPage.newOrEdit.templateRules.addSuccess'));

        this.send('refresh');
      }).catch((err) => {
        set(this, 'saving', false)
        this.growl.fromError(this.intl.t('alertPage.newOrEdit.templateRules.addError'), JSON.stringify(err));
      })
    },
    refresh(){
      this.callback();
      this.send('cancel');
    }
  },

  getMetricRuleTemplate(){
    get(this, 'globalStore').rawRequest({
      url:     `/v3/metricruletemplates/${ this.namespace }:${ this.kind }`,
      method:  'GET',
    }).then((res) => {
      if (res?.body?.data){
        set(this, 'tmpl', this.formatMetricRuleTemplate(res.body.data));
        set(this, 'tmplByUser', this.formatMetricRuleTemplate(res.body.data));
      }
    }).catch((err) => {
      this.growl.fromError(this.intl.t('notifierPage.alertTemplate.error'), JSON.stringify(err));
    })
  },

  formatMetricRuleTemplate(rules){
    const header = 'apiVersion: v1\ndata: \n';
    const footer = `kind: ConfigMap \nmetadata: \n name: ${ this.kind } \n namespace: cattle-global-data`;
    let val = ''

    for (let key in rules){
      val += ` ${ key }: |- \n  ${ rules[key].replace(/\n/g, '\n  ') } \n`
    }

    return `${ header }${ val }${ footer }`
  }
});
