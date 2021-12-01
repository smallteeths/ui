import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import C from 'ui/utils/constants';
import layout from './template';
import { get, observer } from '@ember/object';

export default Component.extend({
  cookies:      service(),
  prefs:        service(),
  intl:         service(),
  layout,
  apiMode:      null,
  mode:         alias('prefs.apiMode'),
  init() {
    this._super(...arguments);
    this.set('apiMode', `${ this.get('mode') }`);
  },

  apiModeChanged: observer('apiMode', function() {
    this.set(`prefs.${ C.PREFS.API_MODE }`, this.get('apiMode'));

    const cookies = get(this, 'cookies');

    cookies.set(C.COOKIE.API_MODE, this.get('apiMode'));
  }),

});
