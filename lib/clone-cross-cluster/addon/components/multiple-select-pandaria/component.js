import { get, set, observer } from '@ember/object';
import Component from '@ember/component';
import layout from './template';
import { inject as service } from '@ember/service';

export default Component.extend({
  settings: service(),

  layout,
  data:    [],
  options: [],
  editing: true,

  selectedOptions: [],

  init() {
    this._super(...arguments);
    let options = []

    get(this, 'data').forEach((ele) => {
      options.push({
        active: get(this, 'selectedOptions').some((item) => item === ele),
        value:  ele,
      })
    });

    set(this, 'options', options)
  },

  actions: {
    change(record) {
      let selectedOptions = get(this, 'selectedOptions')

      if (selectedOptions.some((selectedOption) => selectedOption === record.value )) {
        set(this, 'selectedOptions', selectedOptions.filter((selectedOption) => selectedOption !== record.value))
      } else {
        selectedOptions.push(record.value)

        set(this, 'selectedOptions', selectedOptions.map((item) => item))
      }
    },
  },

  selectedOptionsChange: observer('selectedOptions.[]', function() {
    let options = []

    get(this, 'data').forEach((ele) => {
      options.push({
        active: get(this, 'selectedOptions').some((item) => item === ele),
        value:  ele,
      })
    });

    set(this, 'options', options)
  }),

  calculatePosition(trigger) {
    let {
      top, left, width, height
    } = trigger.getBoundingClientRect();
    let style = {
      width,
      left,
      top: top + window.pageYOffset + height
    };

    return { style };
  },
});
