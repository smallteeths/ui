import Component from '@ember/component';
import ModalBase from 'shared/mixins/modal-base';
import layout from './template';
import { get, set, computed } from '@ember/object';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import { later, run } from '@ember/runloop';

export default Component.extend(ModalBase, {
  router:            service(),
  settings:          service(),
  intl:              service(),
  layout,
  classNames:       ['medium-modal'],
  password:         null,
  confirm:          null,

  confirmBlurred:   false,
  serverErrors:     null,

  model: alias('modalOpts.model'),

  didReceiveAttrs() {
    run.next(this, 'focusStart');
  },
  actions:    {
    save(cb) {
      set(this, 'serverErrors', []);
      const registries = get(this, 'model.registries');
      const firstObject = registries[Object.keys(registries)[0]];

      firstObject.password = this.password;
      set(this, 'model.registries', { ...registries });

      return this.model.save().then(() => {
        this.send('complete', true)
        later(this, () => {
          if ( this.isDestroyed || this.isDestroying ) {
            return;
          }
          cb(true);
        }, 1000);
      }).catch((err) => {
        set(this, 'serverErrors', [err.message]);
        this.send('complete', false)
        cb(false);
      });
    },
    complete(success) {
      if (success) {
        get(this, 'modalService').toggleModal();
      }
    },
    cancel() {
      get(this, 'modalService').toggleModal();
    },

    goBack() {
      get(this, 'modalService').toggleModal();
    },
    blurredConfirm() {
      set(this, 'confirmBlurred', true);
    },
  },
  errors: computed('saveDisabled', 'confirm', 'confirmBlurred', 'serverErrors.[]', function() {
    let out = get(this, 'serverErrors') || [];

    if ( get(this, 'confirmBlurred') && get(this, 'confirm') && get(this, 'saveDisabled') ) {
      out.push(get(this, 'intl').t('modalEditPassword.mismatch'));
    }

    return out;
  }),
  saveDisabled: computed( 'password', 'confirm', function() {
    const pass = (get(this, 'password') || '').trim();
    const confirm = (get(this, 'confirm') || '').trim();

    return !pass || !confirm || pass !== confirm;
  }),
  focusStart() {
    const elem = $('.start')[0]; // eslint-disable-line

    if ( elem ) {
      elem.focus();
    }
  },
});
