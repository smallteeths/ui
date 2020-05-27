import { get, set, observer } from '@ember/object';
import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import NewOrEdit from 'shared/mixins/new-or-edit';
import layout from './template';

export default Component.extend(NewOrEdit, {
  intl:  service(),
  scope: service(),

  vlansubnet: service(),

  layout,
  clusterId:              null,
  namespace:              null,
  ingress:                null,
  namespacedCertificates: null,
  certificates:           null,
  supportVlansubnet:      false,
  enableVlansubnet:       false,

  isGKE:                  null,

  annotationErrors:       null,
  certErrors:             null,

  primaryResource: alias('ingress'),

  init() {
    this._super(...arguments);
    const a = get(this, 'ingress.annotations') || {};

    if (this.supportVlansubnet) {
      if (a['macvlan.panda.io/ingress'] === 'true') {
        set(this, 'enableVlansubnet', true);
      }
    } else {
      a['macvlan.panda.io/ingress'] = 'false';
      set(this, 'ingress.annotations', a);
    }
  },
  actions: {
    setLabels(labels) {
      let out = {};

      labels.forEach((row) => {
        out[row.key] = row.value;
      });

      set(this, 'ingress.labels', out);
    },
    removeIngress(ingress) {
      this.remove(ingress);
    }
  },
  // macvlan
  enableVlansubnetDidChanged: observer('enableVlansubnet', function() {
    const v = get(this, 'enableVlansubnet') && get(this, 'supportVlansubnet');
    const a = get(this, 'ingress.annotations') || {};

    a['macvlan.panda.io/ingress'] = v ? 'true' : 'false';
    set(this, 'ingress.annotations', a);
  }),

  ingressDidChanged: observer('ingress.@each{rules.[],defaultBackend,name,description}', function() {
    this.validate();
  }),

  validate() {
    let intl = get(this, 'intl');

    let pr = get(this, 'primaryResource');
    let errors = pr.validationErrors() || [];

    errors.pushObjects(get(this, 'certErrors') || []);
    errors.pushObjects(get(this, 'annotationErrors') || []);

    if (!get(this, 'ingress.rules.length') && !get(this, 'ingress.defaultBackend')) {
      errors.push(intl.t('newIngress.error.noRules'));
    }
    if (get(this, 'ingress.rules.length')) {
      const invalid = get(this, 'ingress.rules').some((rule) => {
        const paths = [];

        Object.keys(rule.paths).forEach((key) => {
          paths.push(rule.paths[key]);
        });

        return paths.some((path) => !path.targetPort)
      });

      if (invalid) {
        errors.push(intl.t('validation.required', { key: intl.t('generic.port') }));
      }
    }

    if (errors.length) {
      set(this, 'errors', errors.uniq());

      return false;
    }

    return true;
  },
});
