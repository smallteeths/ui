import Component from '@ember/component';
import layout from './template';
import { get, set, observer } from '@ember/object';
import $ from 'jquery';
import { inject as service } from '@ember/service';
import C from 'shared/utils/constants';

export default Component.extend({
  intl:  service(),
  prefs: service(),

  layout,

  url: null,

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
    this.langChanged();
    this.themeChanged();
  },

  willDestroyElement() {
    this._super();
    this.clearInterval();
    if (get(this, 'iframe.iFrameResizer')) {
      get(this, 'iframe.iFrameResizer').close()
    }
  },

  langChanged: observer('intl.locale', function() {
    const locale = get(this, 'intl.locale');
    const iframe = $('#iframe-content').get(0);

    if (locale && locale[0] && iframe) {
      const w = iframe.contentWindow;

      w.postMessage({
        action: 'set-lang',
        name:   locale[0]
      });
    }
  }),

  themeChanged: observer(`prefs.${ C.PREFS.THEME }`, function() {
    const theme = get(this, `prefs.${ C.PREFS.THEME }`)
    const iframe = $('#iframe-content').get(0);

    if (theme && iframe) {
      const w = iframe.contentWindow;

      w.postMessage({
        action: 'set-theme',
        name:   theme
      });
    }
  }),

  clearInterval() {
    const intervalAnchor = get(this, 'intervalAnchor');

    if (intervalAnchor){
      clearInterval(intervalAnchor);
      set(this, 'intervalAnchor', intervalAnchor);
    }
  },
});
