import { inject as service } from '@ember/service';
import { get, set, computed } from '@ember/object';
import Component from '@ember/component';
import ModalBase from 'shared/mixins/modal-base';
import layout from './template';
import { downloadFile } from 'shared/utils/download-files';

export default Component.extend(ModalBase, {
  growl: service(),
  intl:  service(),

  layout,
  classNames:       ['large-modal'],
  containers:       null,
  currentContainer: '',
  filePath:         '',
  errors:           null,
  percent:          -1,
  total:            -1,

  xhr:                null,
  inProgressFunction: null,
  largeFileSize:      false,

  init() {
    this._super(...arguments);
    set(this, 'errors', null);
  },

  didReceiveAttrs() {
    const model = get(this, 'modalService.modalOpts.originalModel').clone();
    const containers = get(this, 'modalService.modalOpts.containers') || get(model, 'containers');

    set(this, 'containers', containers);
    set(this, 'currentContainer', get(containers, 'firstObject.name'));
    set(this, 'model', model);
  },

  willDestroyElement() {
    if (get(this, 'xhr')) {
      get(this, 'xhr').removeEventListener('progress', get(this, 'inProgressFunction'))
    }
  },

  actions: {
    save(cb) {
      if (!this.validate()) {
        cb(false);

        return;
      }

      const filePath = get(this, 'filePath');
      const fileName = filePath.substr(filePath.lastIndexOf('/') + 1);

      if (typeof XMLHttpRequest !== 'undefined' ) {
        const csrf = this.getCookie('CSRF')
        const body =  JSON.stringify({
          containerName: get(this, 'currentContainer'),
          filePath,
        })

        set(this, 'inProgressFunction', (resp) => {
          this.inProgress(resp)
        })
        set(this, 'xhr', new XMLHttpRequest())
        get(this, 'xhr').open('POST', get(this, 'model.actionLinks.download'), true);
        get(this, 'xhr').setRequestHeader('content-type', 'application/json');
        get(this, 'xhr').setRequestHeader('Accept', 'application/json');
        get(this, 'xhr').setRequestHeader('x-api-action-links', 'actionLinks');
        get(this, 'xhr').setRequestHeader('x-api-no-challenge', 'true');
        get(this, 'xhr').setRequestHeader('x-api-csrf', csrf);
        get(this, 'xhr').send(body)
        get(this, 'xhr').addEventListener('progress', get(this, 'inProgressFunction'));

        get(this, 'xhr').onload = (resp) => {
          if (resp && resp.target && resp.target.status === 200) {
            cb(true);
            downloadFile(fileName, resp.target.response, 'application/octet-stream');
            this.send('cancel');
          } else if (resp && resp.target && resp.target.status !== 200){
            if (this.isJson(resp.target.response)) {
              this.growl.fromError('Error', JSON.parse(resp.target.response).message)
            } else {
              this.growl.fromError('Error', 'Unknown Error')
            }
            cb(false);
          } else {
            this.growl.fromError('Error', 'Unknown Error')
          }
        };
      } else {
        get(this, 'globalStore').rawRequest({
          url:     get(this, 'model.actionLinks.download'),
          method:  'POST',
          data:    JSON.stringify({
            containerName: get(this, 'currentContainer'),
            filePath,
          }),
        }).then((data) => {
          if (data.status === 200) {
            cb(true);
            downloadFile(fileName, data.body, 'application/octet-stream');
            this.send('cancel');
          }
        }).catch((err) => {
          this.growl.fromError('Error', err.body.message)
          cb(false);
        });
      }
    },
  },
  choices: computed('containers.[]', function() {
    return (get(this, 'containers') || [])
      .map((c) => {
        return {
          label: c.name,
          value: c.name,
          data:  c,
        };
      });
  }),
  showProgress: computed('percent', function() {
    return parseInt(get(this, 'percent'), 10) >= 0 && parseInt(get(this, 'percent'), 10) < 100;
  }),

  validate() {
    set(this, 'errors', null);
    const currentContainer = get(this, 'currentContainer');
    const filePath = get(this, 'filePath');
    const errors = [];

    if (!currentContainer) {
      errors.push(get(this, 'intl').t('modalDownLoadFileComponent.validateContainer'));
    }
    if (!filePath) {
      errors.push(get(this, 'intl').t('modalDownLoadFileComponent.validatePath'));
    }
    if ( errors.get('length') ) {
      set(this, 'errors', errors);

      return false;
    }

    return true;
  },
  getCookie(key) {
    let match = document.cookie.match(new RegExp(`(^| )${ key }=([^;]+)`));

    if (match) {
      return match[2]
    } else {
      return '';
    }
  },
  formatPercent(value, max) {
    if (max === -1 || value === 0) {
      return 0
    }
    if (value >= max) {
      return 100
    }

    return (value / max * 100).toFixed(2)
  },
  isJson(str) {
    try {
      let obj = JSON.parse(str);

      if (typeof obj === 'object' && obj ){
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  },
  inProgress(resp) {
    if (resp && resp.target) {
      if (resp.target.status === 200) {
        if (resp.target && resp.target.getResponseHeader('x-decompressed-content-length') && get(this, 'total') === -1) {
          set(this, 'total', parseInt(resp.target.getResponseHeader('x-decompressed-content-length'), 10))
          if (get(this, 'total') / (1024 * 1024) > 600) {
            set(this, 'largeFileSize', true);
          }
        }
        if (resp.loaded) {
          set(this, 'percent', this.formatPercent(resp.loaded, get(this, 'total')));
        }
      }
    }
  }
});
