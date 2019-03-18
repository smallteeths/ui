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
  harbor:                service(),
  modalVisible:          false,
  projectId:             '',
  tagName:               'div',
  classNames:            ['modal-overlay'],
  classNameBindings:     ['modalVisible:modal-open:modal-closed'],
  attributeBindings:     ['style'],
  role:                  1,
  username:              '',
  validateText:          '',
  validateUsername:      false,
  saving:                false,
  checkRadio:            [
    {
      id:        1,
      checked:   'true',
      name:      '项目管理员'
    },
    {
      id:        2,
      checked:   'false',
      name:      '开发人员'
    },
    {
      id:        3,
      checked:   'false',
      name:      '访客'
    },
  ],
  style:                 htmlSafe('position: fixed'),
  init() {
    set(this, 'saving', false);
    this._super();
  },
  actions:               {
    save(callback) {
      let params = {};

      Object.assign(params, {
        member_user: { username: get(this, 'username') },
        role_id:     get(this, 'role')
      })
      get(this, 'harbor').addProjectUser(params, get(this, 'projectId')).then((resp) => {
        this.sendAction('saved');
        this.toggleModal();

        callback(true);
      }).catch((err) => {
        console.log(err.status === 409)
        set(this, 'validateUsername', true);
        set(this, 'saving', false);
        if (err.status === 409){
          set(this, 'validateText', '添加失败,用户已经添加')
        }
        if (err.status === 404){
          set(this, 'validateText', '添加失败,用户不纯在')
        }

        callback(true);
      });
    },
    close() {
      set(this, 'validateUsername', false);
      set(this, 'validateText', '');
      set(this, 'role', 1);
      set(this, 'username', '');
      set(this, 'saving', false);
      this.toggleModal();
    },
    cancel() {
      set(this, 'validateUsername', false);
      set(this, 'validateText', '');
      set(this, 'role', 1);
      set(this, 'username', '');
      set(this, 'saving', false);
      this.toggleModal();
    },
    confirm() {
      this.sendAction('confirm');
    },
  },
  visible: observer('modalVisible', function() {
    const v = get(this, 'modalVisible');
  }),
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
  }
});