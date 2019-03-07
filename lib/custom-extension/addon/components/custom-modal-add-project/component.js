import $ from 'jquery';
import { next } from '@ember/runloop';
import Component from '@ember/component';
import layout from './template';
import C from 'ui/utils/constants';
import { get, set, observer } from '@ember/object';
import { inject as service } from '@ember/service';
import Errors from 'ui/utils/errors';

export default Component.extend({
  harbor:                service(),
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
  style:                 'position: fixed',
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
      cb = cb || function() {};

      set(this, 'errors', null);
      var ok = this.validate();

      if (!ok) {
        cb(false);

        return;
      }
      const project = get(this, 'project');
      const data = {
        project_name: project.project_name,
        metadata:     { public: project.metadata.public ? 'true' : 'false' }
      };

      get(this, 'harbor').createProject(data).then(() => {
        this.send('cancel');
        cb(true);
        this.sendAction('saved');
      }).catch((err) => {
        let errors = [];

        if (err.status === 409) {
          errors.push('项目名称已经存在');
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
    const errors = [];
    const project = get(this, 'project');
    const nameReg = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

    if (!nameReg.test(project.project_name)) {
      errors.push('项目名称由小写字符、数字、和._-组成，且至少有两个字符并以字母或数字开头');
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
});