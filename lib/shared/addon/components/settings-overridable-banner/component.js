import Component from '@ember/component';
import layout from './template';
import { inject as service } from '@ember/service';
import $ from 'jquery';
import { computed } from '@ember/object';
import { htmlSafe } from '@ember/string';

export default Component.extend({
  settings: service(),
  layout,

  classNameBindings: ['show::hide'],
  show:              false,

  didReceiveAttrs() {
    const { model = {} } = this;
    const bannerStyle = {
      color:              model.color,
      'background-color': model.background,
      'text-align':       model.textAlignment,
      'font-weight':      model.fontWeight ? 'bold' : '',
      'font-style':       model.fontStyle ? 'italic' : '',
      'font-size':        model.fontSize,
      'text-decoration':  model.textDecoration ? 'underline' : ''
    }

    $(this.element).css(bannerStyle);
  },

  bannerText: computed('model.text', function() {
    const { model = {} } = this;
    const { text = '' } = model;

    return htmlSafe(text);
  }),
});
