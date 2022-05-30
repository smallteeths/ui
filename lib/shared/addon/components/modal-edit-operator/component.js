import { scheduleOnce, next } from '@ember/runloop';
import { inject as service } from '@ember/service';
import { alias, equal } from '@ember/object/computed';
import Component from '@ember/component';
import NewOrEdit from 'shared/mixins/new-or-edit';
import ModalBase from 'shared/mixins/modal-base';
import { computed, get, set, setProperties } from '@ember/object';
import { NEW } from 'shared/mixins/view-new-edit';
import layout from './template';
import $ from 'jquery';

export default Component.extend(ModalBase, NewOrEdit, {
  globalStore: service(),
  growl:       service(),
  intl:        service(),

  layout,
  classNames:      ['large-modal', 'alert'],
  clone:           null,
  errors:          null,
  saving:          false,
  providerChoices:      [
    {
      label: 'Alibaba',
      value: 'ackoperatorsetting',
    }
  ],

  originalModel:    alias('modalService.modalOpts'),
  createdProviders: alias('originalModel.createdProviders'),
  mode:             alias('originalModel.mode'),
  callback:         alias('modalService.modalOpts.callback'),
  isNew:            equal('mode', NEW),

  init() {
    this._super(...arguments);

    const originalModel = get(this, 'originalModel');
    const clone = originalModel.clone ? originalModel.clone() : originalModel;

    setProperties(this, {
      clone,
      model: clone,
    })

    scheduleOnce('afterRender', this, 'setupFocus');
  },

  actions: {
    save(cb){
      if (!this.validate()) {
        cb(false);

        return;
      }

      const {
        name, url, id, active
      } = this.model;

      this.get('globalStore').rawRequest({
        url:    `/v3/operatorsettings${ id ? `/${ id }` : '' }`,
        method: id ? 'PUT' : 'POST',
        data:   {
          id,
          active:  id ? !!active : true,
          builtIn: false,
          name,
          url,
        }
      }).then(() => {
        this.callback && this.callback();
        this.send('cancel');
      }).catch((err) => {
        set(this, 'saving', false);
        set(this, 'errors', [err?.body?.message || err?.message || JSON.stringify(err)])
      });
    },
  },

  editing: computed('clone.id', function() {
    return !!get(this, 'clone.id');
  }),

  doneSaving() {
    this.send('cancel');
  },

  validate(){
    const createdProviders = this.createdProviders;
    const model = this.model;
    const errors = [];

    if (!model.name){
      errors.push(this.intl.t('operatorPage.provider.request'));
    } else {
      if (this.isNew){
        if (createdProviders.indexOf(get(model, 'name')) > -1){
          errors.push(this.intl.t('operatorPage.provider.existError', { provider: this.providerChoices.find((item) => item.value === get(model, 'name'))?.label || '' }));
        }
      }
    }

    if (!model.url){
      errors.push(this.intl.t('operatorPage.url.request'));
    }

    if (errors.length){
      set(this, 'errors', errors);

      return false;
    }

    return true;
  },

  setupFocus() {
    next(() => $(this.element).find('input:first')[0].focus()); // gotta make sure that modal is rendered
  },
});
