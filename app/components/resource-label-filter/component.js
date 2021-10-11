import Component from '@ember/component';
import layout from './template';
import { inject as service } from '@ember/service';
import { set } from '@ember/object';

const OPERATORS = [
  {
    label:    'In',
    value:    'in',
    validate(key, values, labels) {
      return labels.hasOwnProperty(key) && values.includes(labels[key]);
    },
    hasValue: true
  },
  {
    label:    'NotIn',
    value:    'notIn',
    validate(key, values, labels) {
      return labels.hasOwnProperty(key) && !values.includes(labels[key]);
    },
    hasValue: true
  },
  {
    label:    'Exists',
    value:    'exists',
    validate(key, values, labels) {
      return labels.hasOwnProperty(key) ;
    },
    hasValue: false
  },
  {
    label:    'DoesNotExist',
    value:    'doesNotExist',
    validate(key, values, labels) {
      return !labels.hasOwnProperty(key);
    },
    hasValue: false,
  }
];

export default Component.extend({
  intl:     service(),
  growl:    service(),

  layout,
  operators:         OPERATORS,
  labelSelector:     [],
  labelSelectorForm: [],

  initLabelSelector: [],

  init() {
    this._super(...arguments);
    if (this.initLabelSelector && this.initLabelSelector.length > 0) {
      set(this, 'labelSelector', this.initLabelSelector.map((item) => ({
        key:      item.key,
        operator: item.operator,
        values:   item.values,
        hasValue: item.hasValue,
      })));
    }
  },

  actions: {
    search() {
      const p = this.labelSelectorForm.reduce((t, c) => {
        const label = c.key.trim();

        if (label) {
          const o = OPERATORS.find((item) => item.value === c.operator);

          if (o.hasValue) {
            const values = c.values.split(',').reduce((v, vc) => {
              if (vc.trim()) {
                v.push(vc.trim());
              }

              return v;
            }, []);

            if (values.length > 0) {
              t.push({
                key:      label,
                values,
                operator: o.value,
                hasValue: o.hasValue,
                validate: o.validate,
              });
            }
          } else {
            t.push({
              key:      label,
              hasValue: o.hasValue,
              operator: o.value,
              validate: o.validate,
            })
          }
        }

        return t;
      }, []);

      set(this, 'labelSelector', p);
      this.onChange && this.onChange(p);
    },
    addQueryLabel() {
      this.labelSelectorForm.pushObject({
        key:      '',
        operator: 'in',
        values:   '',
      });
    },
    removeQueryLabel(l) {
      this.labelSelectorForm.removeObject(l);
    },
    clean() {
      set(this, 'labelSelectorForm', [])
      this.send('search');
    },
    onOpen() {
      let f = this.labelSelector.map((l) => ({
        key:      l.key,
        values:   (l.hasValue ? l.values : []).join(','),
        operator: l.operator,
      }));

      if (f.length === 0) {
        f = [{
          key:      '',
          operator: 'in',
          values:   '',
        }];
      }

      set(this, 'labelSelectorForm', f);
    },
  },

});
