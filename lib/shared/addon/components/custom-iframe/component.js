import Component from '@ember/component';
import layout from './template';
import { get, set } from '@ember/object';
import $ from 'jquery';

export default Component.extend({
  layout,

  url:      null,

  init() {
    this._super();
    this.clearInterval();
    set(this, 'loading', true);

    const iframe = iFrameResize({ log: true, }, '#iframe-content')

    set(this, 'iframe', iframe);

    const intervalAnchor = setInterval(() => {
      if ( $('#iframe-div').contents().length > 0) {
        set(this, 'loading', false);
        this.clearInterval();
      }
    }, 800);

    set(this, 'intervalAnchor', intervalAnchor);
  },

  willDestroyElement() {
    this._super();
    this.clearInterval();
    if (get(this, 'iframe')) {
      get(this, 'iframe').iFrameResizer.close()
    }
  },

  clearInterval() {
    const intervalAnchor = get(this, 'intervalAnchor');

    if (intervalAnchor){
      clearInterval(intervalAnchor);
      set(this, 'intervalAnchor', intervalAnchor);
    }
  },
});
