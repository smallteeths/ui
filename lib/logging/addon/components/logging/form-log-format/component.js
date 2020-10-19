import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { observer, setProperties, get } from '@ember/object';
import { reads } from '@ember/object/computed';
import $ from 'jquery';

export default Component.extend({
  scope:                   service(),
  router:                  service(),

  pageScope:               reads('scope.currentPageScope'),
  targetType:              reads('router.currentRoute.queryParams.targetType'),

  outputTagsChanged: observer('model.outputTags', function() {
    this.setCodeBlockHeight();
  }),

  enableMultiLineMergeChanged: observer('model.enableMultiLineMerge', function() {
    const enableMultiLineMerge = get(this, 'model.enableMultiLineMerge')
    const model = get(this, 'model')

    if (!enableMultiLineMerge) {
      setProperties(model, {
        enableExceptionStackMatch: false,
        enableMultiLineFilter:     false,
      })
    }
  }),

  enableMultiLineFilterChanged: observer('model.enableMultiLineFilter', function() {
    const enableMultiLineFilter = get(this, 'model.enableMultiLineFilter')
    const model = get(this, 'model')

    if (!enableMultiLineFilter) {
      setProperties(model, {
        multiLineStartRegexp: null,
        multiLineEndRegexp:   null,
      })
    }
  }),
  setCodeBlockHeight() {
    const h = $('.additional-logging-configuration-content').height() + 12;

    $('.logging-format pre').height(`${ h  }px`);
  },

});
