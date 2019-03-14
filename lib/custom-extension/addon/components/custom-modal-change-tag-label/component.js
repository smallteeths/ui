import $ from 'jquery';
import { next } from '@ember/runloop';
import Component from '@ember/component';
import layout from './template';
import C from 'ui/utils/constants';
import { get, set, observer, computed } from '@ember/object';
import { inject as service } from '@ember/service';
import { htmlSafe } from '@ember/string';
import { all as PromiseAll } from 'rsvp';

export default Component.extend({
  harbor:                service(),
  layout,
  tagName:               'div',
  classNames:            ['modal-overlay'],
  classNameBindings:     ['modalVisible:modal-open:modal-closed'],
  modalVisible:          false,
  escToClose:            false,
  modalOpts:             null,
  lastScroll:            null,
  closeWithOutsideClick: false,
  showProtip:            false,
  attributeBindings:     ['style'],
  labelColors:           [],
  allLabels:             [],
  checkedLabels:          [],
  imageRepo:             null,
  imageTag:              null,
  style:                 htmlSafe('position: fixed'),
  actions:               {
    onOpen() {

    },
    onClose() {

    },
    save(cb) {
      cb = cb || function() {};

      const userSelectedLabels = get(this, 'labels').filter((item) => item.checked).map((item) => item.id);
      const existedLabels = get(this, 'checkedLabels').map((item) => item.id);
      const deleteLabels = existedLabels.filter((item) => !userSelectedLabels.includes(item)).map((item) => {
        return get(this, 'harbor').removeTagLabels(get(this, 'imageRepo'), get(this, 'imageTag'), [item]);
      });
      const addLabels = userSelectedLabels.filter((item) => !existedLabels.includes(item)).map((item) => {
        return get(this, 'harbor').addTagLabels(get(this, 'imageRepo'), get(this, 'imageTag'), [item]);
      });
      const promises = [...deleteLabels, ...addLabels];

      PromiseAll(promises).then(() => {
        cb(true);
        this.send('cancel');
        this.sendAction('saved')
      }).catch(() => {
        cb(true);
        this.send('cancel');
        this.sendAction('saved')
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
  labels: computed('modalVisible', 'allLabels', 'checkedLabels', function() {
    if (!get(this, 'modalVisible')) {
      return [];
    }
    const allLabels = get(this, 'allLabels');
    const checkedlabels = get(this, 'checkedLabels');

    const labels = allLabels.map((item) => {
      const label = {
        id:      item.id,
        name:    item.name,
        checked: false,
        style:   this.genLabelStyle(item.color),
      };

      if (checkedlabels.find((checkedItem) => checkedItem.id === item.id)) {
        label.checked = true;
      }

      return label;
    });

    return labels;
  }),
  genLabelStyle(color) {
    color = color || '#FFFFFF';
    const font = get(this, 'labelColors').find((c) => c.color === color)
    const border = color === '#FFFFFF' ? '1px solid rgb(161, 161, 161);' : 'none';

    return htmlSafe(`display: inline-block;padding:0 6px 1px;border-radius: 6px;margin: 4px 4px;border:${ border };background-color:${ color }; color:${ font && font.textColor }`);
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