import Component from '@ember/component';
import { observer, set } from '@ember/object'
import layout from './template';

const SCHEME = 'https://';

export default Component.extend({
  layout,

  tolerate:        null,
  editing:         true,
  title:           null,
  tolerationArray: null,
  scheme:          SCHEME,
  urlInvalid:      false,

  init() {
    this._super(...arguments);
    this.initArray();
  },

  actions: {
    addItem() {
      this.get('array').pushObject({
        label:         '',
        url:           '',
        iframeEnabled: false,
      });
      set(this, 'iframeEnabledChanged', false)
    },

    removeItem(item) {
      this.get('array').removeObject(item);
    },
  },

  inputChanged: observer('array.@each.{label,url}', function() {
    this.set('arrays', (this.get('array') || []).filter((a) => a.label && a.url));
  }),

  onIframeEnabledChanged: observer('array.@each.{iframeEnabled}', function() {
    set(this, 'iframeEnabledChanged', true);
  }),

  initArray() {
    const arrays = this.get('arrays') || [];

    this.set('array', arrays);
  },
})