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
  label:                 null,
  showProtip:            false,
  scope:                 'g',
  projectId:             0,
  attributeBindings:     ['style'],
  style:                 'position: fixed',
  labelColors:           [],
  init() {
    this._super();
    set(this, 'errors', null);
    set(this, 'label', {
      name:        '',
      description: '',
      color:       '#FFFFFF',
      scope:       get(this, 'scope'),
      project_id:  get(this, 'projectId'),
    });
  },
  actions:               {
    onOpen() {

    },
    onClose() {

    },
    changeColor(color) {
      set(this, 'label.color', color.color);
    },
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
      const label = get(this, 'label');

      get(this, 'harbor').createLabel(label).then(() => {
        this.send('cancel');
        cb(true);
        this.sendAction('saved');
      }).catch((err) => {
        let errors = [];

        if (err.status === 409) {
          errors.push('标签名称已经存在');
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
      this.sendAction('confirm');
    },
  },
  visible: observer('modalVisible', function() {
    const v = get(this, 'modalVisible');

    if (v) {
      set(this, 'label', {
        name:        '',
        description: '',
        color:       '#FFFFFF',
        scope:       get(this, 'scope'),
        project_id:  get(this, 'projectId'),
      });
      set(this, 'errors', null);
    }
  }),
  validate() {
    const errors = [];
    const label = get(this, 'label');

    if (!label) {
      errors.push('请输入标签名称');
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