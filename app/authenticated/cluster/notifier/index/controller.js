import { get, set, computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import Controller from '@ember/controller';

export default Controller.extend({
  modalService: service('modal'),
  globalStore:  service(),
  growl:        service(),
  intl:         service(),
  scope:        service(),

  queryParams: ['type'],
  currentType: 'slack',

  notifiers: alias('model.notifiers'),
  actions:   {
    showNewEditModal() {
      get(this, 'modalService').toggleModal('notifier/modal-new-edit', {
        closeWithOutsideClick: false,
        controller:            this,
        currentType:           get(this, 'currentType'),
        mode:                  'add',
      });
    },
    showAlertTemplate() {
      get(this, 'modalService').toggleModal('notifier/modal-add-alert-template', {
        closeWithOutsideClick: false,
        controller:            this,
        notificationtemplate:  get(this, 'model.notificationtemplate'),
        notificationSecret:    get(this, 'model.secret.notificationSecret'),
        mode:                  'edit',
        callback:              (tmpl, enabled, toggleModal) => {
          // If notificationtemplate has clusterId so notificationtemplate crd already exits.
          if (get(this, 'model.notificationtemplate') && get(this, 'model.notificationtemplate.clusterId')) {
            let params = get(this, 'model.notificationtemplate')

            if (params) {
              params.content = tmpl
              params.enabled = enabled
            }

            get(this, 'globalStore').rawRequest({
              url:     params.links.update,
              method:  'PUT',
              data:    params,
            }).then(() => {
              this.send('refreshModel');
            }).catch((err) => {
              set(toggleModal, 'saving', false)
              this.growl.fromError(this.intl.t('notifierPage.alertTemplate.error'), JSON.stringify(err));
            })
          } else {
            let params = {
              content:     tmpl,
              enabled,
              clusterId:   get(this, 'model.clusterId'),
            }

            get(this, 'globalStore').rawRequest({
              url:     `/v3/notificationTemplates`,
              method:  'POST',
              data:    params,
            }).then(() => {
              this.send('refreshModel');
            }).catch((err) => {
              set(toggleModal, 'saving', false);
              this.growl.fromError(this.intl.t('notifierPage.alertTemplate.error'), JSON.stringify(err));
            })
          }
        },
      });
    },
  },

  disabledAddNotificationSecret: computed('model.secret.notificationSecret', function(){
    return !(get(this, 'model.secret.notificationSecret') && get(this, 'model.secret.notificationSecret.data') && get(this, 'model.secret.notificationSecret.data')['notification.tmpl'])
  }),
});
