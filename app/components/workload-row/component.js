import { or } from '@ember/object/computed';
import Component from '@ember/component';
import layout from './template';
import { inject as service } from '@ember/service'
import { set, computed } from '@ember/object';

export default Component.extend({
  scope:             service(),
  session:           service(),

  layout,
  model:             null,
  tagName:           '',
  subMatches:        null,
  expanded:          null,

  canExpand:         true,
  showInstanceCount: true,
  showImage:         true,
  showAddPodModal:   false,
  podChangeNum:      0,

  showLabelRow:      or('model.displayUserLabelStrings.length'),

  actions:      {
    toggle() {
      if (this.toggle) {
        this.toggle(this.model.id);
      }
    },
    podDown(){
      this.adjustPod(-1);
    },
    podUp(){
      this.adjustPod(1);
    }
  },

  podCount: computed('model.pods.[]', function() {
    const { pods = [] } = this.model;

    return pods.length;
  }),
  adjustPod(num){
    set(this, 'podChangeNum', num)
    set(this, 'showAddPodModal', true);
  }
});
