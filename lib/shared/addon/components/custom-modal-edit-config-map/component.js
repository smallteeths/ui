import { scheduleOnce } from '@ember/runloop';
import Component from '@ember/component';
import ModalBase from 'shared/mixins/modal-base';
import layout from './template';
import { alias } from '@ember/object/computed';
import { get, set, computed, setProperties } from '@ember/object';
import { inject as service } from '@ember/service';

export default Component.extend(ModalBase, {
  intl: service(),

  layout,
  model:          null,
  namespacedType: 'configMap',
  scope:          'namespace',
  titleKey:       'newConfigMap.title',

  namespace:       alias('modalOpts.namespace'),
  originalModel:   alias('modalOpts.model'),
  init() {
    this._super(...arguments);
    set(this, 'errors', null);

    const clone = get(this, 'originalModel').clone();

    setProperties(this, { model: clone });

    scheduleOnce('afterRender', () => {
      this.$('INPUT')[0].focus();
    });
  },
  actions: {
    updateData(map) {
      set(this, 'model.data', map);
    },
    save(cb) {
      const ok = this.validate();

      if (!ok) {
        cb(false);

        return;
      }
      cb(true);
      get(this, 'modalOpts.done')(this.model, this.originalModel);
      this.send('close');
    },
  },
  title: computed('originalModel.displayName', 'titleKey', function() {
    const prefix = get(this, 'titleKey');
    const mode = 'edit';
    const intl = get(this, 'intl');

    let name = get(this, 'originalModel.displayName')
            || '';

    return intl.t(`${ prefix }.${ mode }`, { name });
  }),
  validate() {
    set(this, 'errors', null)
    var model = get(this, 'model');
    var errors = model.validationErrors();

    if ( errors.get('length') ) {
      set(this, 'errors', errors);
    }

    return errors.length === 0;
  },
});
