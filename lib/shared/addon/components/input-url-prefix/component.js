import TextField from '@ember/component/text-field';
import { inject as service } from '@ember/service';
import { get, set } from '@ember/object';
import { scheduleOnce } from '@ember/runloop';

export default TextField.extend({
  intl:              service(),

  type:              'url',
  canAdd:            false,

  init() {
    this._super(...arguments);
    scheduleOnce('afterRender', () => {
      let val = null;
      const value = get(this, 'element.value') || ''

      if (!value.startsWith('https://') && !value.startsWith('http://') && get(this, 'canAdd')) {
        val = `https://${ value }`
      } else {
        val = get(this, 'element.value') || '';
      }

      set(this, 'value', val);
    });
  },
});
