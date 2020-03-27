import Component from '@ember/component';
import { observer } from '@ember/object'
import layout from './template';

export default Component.extend({
  layout,

  tolerate:        null,
  editing:         true,
  title:           null,
  tolerationArray: null,
  init() {
    this._super(...arguments);
    this.initArray();
  },

  actions: {
    addItem() {
      this.get('array').pushObject({
        label: '',
        url:   '',
      });
    },

    removeItem(item) {
      this.get('array').removeObject(item);
    },
  },

  inputChanged: observer('array.@each.{label,url}', function() {
    this.set('arrays', (this.get('array') || []).filter((a) => a.label && a.url));
  }),

  initArray() {
    const arrays = this.get('arrays') || [];

    this.set('array', arrays);
  },
})