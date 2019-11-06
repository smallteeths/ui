import { next } from '@ember/runloop';
import Component from '@ember/component';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { htmlSafe } from '@ember/string';
import { debouncedObserver } from 'ui/utils/debounce';

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
  errors:                null,
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
      get(this, 'harbor').addProjectUser(params, get(this, 'projectId')).then(() => {
        this.sendAction('saved');
        this.toggleModal();
        callback(true);
      }).catch((err) => {
        set(this, 'saving', false);
        if (err.status === 409){
          set(this, 'errors', ['添加失败,用户已经添加'])
        }
        if (err.status === 500){
          set(this, 'errors', ['添加失败,用户名不能为空'])
        }
        if (err.status === 404){
          set(this, 'errors', ['添加失败,用户不存在'])
        }

        callback(false);
      });
    },
    close() {
      set(this, 'errors', null);
      set(this, 'role', 1);
      set(this, 'username', '');
      set(this, 'saving', false);
      this.toggleModal();
    },
    cancel() {
      set(this, 'errors', null);
      set(this, 'role', 1);
      set(this, 'username', '');
      set(this, 'saving', false);
      this.toggleModal();
    },
    confirm() {
      this.sendAction('confirm');
    },
  },
  searchMember: debouncedObserver('username', function() {
    const username = get(this, 'username');

    if (username === '') {
      return;
    }
    get(this, 'harbor').fetchProjectMembers(get(this, 'projectId'), username).then((resp) => {
      if (get(this, 'username') === username && resp.body.length > 0 && resp.body[0].entity_name === username) {
        set(this, 'errors', ['用户已经存在'])
      } else {
        set(this, 'errors', null);
      }
    });
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