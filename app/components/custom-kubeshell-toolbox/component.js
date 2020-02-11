import Component from '@ember/component';
import layout from './template';
import { get, set, computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import { htmlSafe } from '@ember/string';
import { inject as service } from '@ember/service';

export default Component.extend({
  modalService:          service('modal'),
  scope:                 service(),
  intl:                  service(),
  layout,
  tagName:               'div',
  classNames:            ['custom-kubeshell-toolbox-modal-popover not-select '],
  classNameBindings:     ['modalVisible:modal-open:modal-closed', 'cluster:dis-block:dis-none', 'zh-hans:zh-hans:en-us'],
  modalVisible:          false,
  mouseTimer:            null,
  attributeBindings:     ['style'],
  cluster:               alias('scope.currentCluster'),
  style:                 htmlSafe('position: fixed;right: 0px;bottom: 150px;z-index: 8;'),
  init() {
    this._super();
    set(this, 'errors', null);
  },
  actions: {
    kubectl() {
      this.get('modalService').toggleModal('modal-kubectl', {});
    },

    kubeconfig() {
      this.get('modalService').toggleModal('modal-kubeconfig', { escToClose: true, });
    },
  },
  'zh-hans': computed('intl.locale', function() {
    const intl = get(this, 'intl.locale');

    return intl[0] === 'zh-hans'
  }),
  mouseEnter(){
    clearTimeout(get(this, 'mouseTimer'));
    set(this, 'modalVisible', true);

    return true;
  },
  mouseLeave() {
    let timer = setTimeout(() => {
      set(this, 'modalVisible', false);
      clearTimeout(timer);
    }, 200);

    set(this, 'mouseTimer', timer);

    return true;
  },
});
