import $ from 'jquery';
import { next } from '@ember/runloop';
import Component from '@ember/component';
import layout from './template';
import C from 'ui/utils/constants';
import { get, set, observer } from '@ember/object';
import { inject as service } from '@ember/service';
import Errors from 'ui/utils/errors';
import { htmlSafe } from '@ember/string';

export default Component.extend({
  harborV2:              service(),
  settings:              service(),
  intl:                  service(),
  layout,
  tagName:               'div',
  classNames:            ['modal-overlay'],
  classNameBindings:     ['modalVisible:modal-open:modal-closed'],
  errors:                null,
  modalVisible:          false,
  escToClose:            false,
  modalOpts:             null,
  lastScroll:            null,
  closeWithOutsideClick: false,
  project:               null,
  showProtip:            false,
  attributeBindings:     ['style'],
  size:                  -1,
  storageUnitValue:      'GB',
  storageUnit:           [
    {
      label: 'MB',
      value: 'MB',
    },
    {
      label: 'GB',
      value: 'GB',
    },
    {
      label: 'TB',
      value: 'TB',
    },
  ],
  style:                 htmlSafe('position: fixed'),
  init() {
    this._super();
    set(this, 'errors', null);
    set(this, 'project', {
      project_name: '',
      metadata:     { public: false },
    });
  },
  actions:               {
    error(err) {
      if (err) {
        var body = Errors.stringify(err);

        if (body) {
          set(this, 'errors', [body]);
        }
      } else {
        set(this, 'errors', null);
      }
    },
    save(cb) {
      const intl = get(this, 'intl');

      cb = cb || function() {};

      set(this, 'errors', null);
      var ok = this.validate();

      if (!ok) {
        cb(false);

        return;
      }
      const project = get(this, 'project');
      const size = get(this, 'size') !== -1 ? this.changeToBytes(get(this, 'size'), get(this, 'storageUnitValue')) : -1;
      const data = {
        project_name:  project.project_name,
        storage_limit: size,
        metadata:      { public: project.metadata.public ? 'true' : 'false' }
      };

      get(this, 'harborV2').createProject(data).then(() => {
        this.send('cancel');
        cb(true);
        this.sendAction('saved');
      }).catch((err) => {
        let errors = [];

        if (err.status === 409) {
          errors.push(intl.t('harborConfig.validate.projectNameExist'));
        } else {
          errors.push([err.body]);
        }

        set(this, 'errors', errors);
        cb(false);
      });
    },
    close() {
      this.toggleModal();
    },

    cancel() {
      this.toggleModal();
    },
    confirm() {
      const resources = get(this, 'resources').slice().reverse();

      this.sendAction('confirm', resources);
    },
  },
  visible: observer('modalVisible', function() {
    const v = get(this, 'modalVisible');

    if (v) {
      set(this, 'project', {
        project_name: '',
        metadata:     { public: false },
      });
      set(this, 'errors', null);
    }
  }),
  validate() {
    const intl = get(this, 'intl');
    const errors = [];
    const project = get(this, 'project');
    const nameReg = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

    if (project.project_name === '') {
      errors.push(intl.t('harborConfig.validate.projectNameReq'));
    } else if (!nameReg.test(project.project_name)) {
      errors.push(intl.t('harborConfig.validate.projectNameFormatError'));
    }
    if (errors.length > 0) {
      set(this, 'errors', errors);

      return false;
    }
    set(this, 'errors', null);

    return true;
  },
  submit(event) {
    event.preventDefault();
    this.send('save');
  },
  click(e) {
    if (get(this, 'closeWithOutsideClick') && $(e.target).hasClass('modal-open')) {
      this.toggleModal();
    }
  },
  keyUp(e) {
    if (e.which === C.KEY.ESCAPE && this.escToClose()) {
      this.toggleModal();
    }
  },
  toggleModal(opts = null) {
    if (opts) {
      set(this, 'modalOpts', opts);
    }

    if ( get(this, 'modalVisible') ) {
      set(this, 'modalVisible', false);
      set(this, 'modalOpts', null);
      next(() => {
        window.scrollTo(0, get(this, 'lastScroll'));
      });
    } else {
      set(this, 'lastScroll', window.scrollY);
      set(this, 'modalVisible', true);
      next(() => {
        window.scrollTo(0, 0);
      });
    }
  },
  changeToBytes(size, unit) {
    if (unit === 'MB') {
      return size * 1024 * 1024
    } else if (unit === 'GB') {
      return size * 1024 * 1024 * 1024
    } else if ( unit === 'TB') {
      return size * 1024 * 1024 * 1024 * 1024
    } else {
      return -1
    }
  },
});
