import Component from '@ember/component';
import layout from './template';
import { computed, get } from '@ember/object';
import { htmlSafe } from '@ember/string';


export default Component.extend({
  layout,
  model:       null,
  isLocal:     null,
  labelColors: [],
  tagName:     'TR',
  classNames:  'main-row',
  labelStyle:  computed('model.color', function() {
    const color = get(this, 'model.color') || '#FFFFFF';
    const font = get(this, 'labelColors').find((c) => c.color === color)
    const border = color === '#FFFFFF' ? '1px solid rgb(161, 161, 161);' : 'none';

    return htmlSafe(`display: inline-block;padding:0 6px 1px;border-radius: 6px;border:${ border };background-color:${ color }; color:${ font && font.textColor }`);
  }),
});