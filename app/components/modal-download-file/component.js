import { inject as service } from '@ember/service';
import { get, set, computed } from '@ember/object';
import Component from '@ember/component';
import ModalBase from 'shared/mixins/modal-base';
import layout from './template';
import { downloadFile } from 'shared/utils/download-files';

export default Component.extend(ModalBase, {
  growl: service(),

  layout,
  classNames:       ['large-modal'],
  containers:       null,
  currentContainer: '',
  filePath:         '',
  errors:           null,

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

  actions: {
    save(cb) {
      if (!this.validate()) {
        cb(false);

        return;
      }

      const filePath = get(this, 'filePath');
      const fileName = filePath.substr(filePath.lastIndexOf('/') + 1);

      get(this, 'model').doAction('download', {
        containerName: get(this, 'currentContainer'),
        filePath,
      }).then((resp) => {
        cb(true);
        downloadFile(fileName, AWS.util.base64.decode(resp.fileContent), 'application/octet-stream');
        this.send('cancel');
      }).catch(() => {
        cb(false)
      });
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
  validate() {
    set(this, 'errors', null);
    const currentContainer = get(this, 'currentContainer');
    const filePath = get(this, 'filePath');
    const errors = [];

    if (!currentContainer) {
      errors.push('请选择容器');
    }
    if (!filePath) {
      errors.push('请输入要下载文件的路径');
    }
    if ( errors.get('length') ) {
      set(this, 'errors', errors);

      return false;
    }

    return true;
  }
});
