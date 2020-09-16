import Component from '@ember/component';
import layout from './template';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';

export default Component.extend({
  intl:       service(),
  layout,
  model:      null,
  isLocal:    null,

  tagName:    'TR',
  classNames: 'main-row',
  init() {
    let intl = get(this, 'intl');

    this._super(...arguments);
    let d = new Date(get(this, 'model.op_time'));

    var Y, M, D, h, m, p;

    Y = `${ d.getFullYear() }/`;
    M = (d.getMonth() + 1 < 10 ? `0${ (d.getMonth() + 1) }` : (d.getMonth() + 1));
    D = (d.getDate() < 10 ? `0${ d.getDate() }` : d.getDate());
    h = d.getHours();
    m = d.getMinutes() < 10 ? `0${ d.getMinutes() }` : d.getMinutes();

    /*
    p = '上午'
    if ( h > 12 ){
      h = h - 12;
      p = '下午'
    }
    h = (h  < 10 ? `0${ h }` : h) ;

    set(this, 'model.op_time', `${ Y }${ M }/${ D } ${ p }${ h }:${ m }` );
    */
    if (intl.locale && intl.locale[0] === 'zh-hans'){
      p = '上午'
      if ( h > 12 ){
        h = h - 12;
        p = '下午'
      }
      h = (h  < 10 ? `0${ h }` : h) ;
      set(this, 'model.op_time', `${ Y }${ M }/${ D } ${ p }${ h }:${ m }` );
    } else if (intl.locale && intl.locale[0] === 'en-us'){
      p = 'am'
      if ( h > 12 ){
        h = h - 12;
        p = 'pm'
      }
      h = (h  < 10 ? `${ h }` : h) ;
      set(this, 'model.op_time', `${ Y }${ M }/${ D } ${ h }.${ m }${ p }` );
    } else {
      set(this, 'model.op_time', `${ Y }${ M }/${ D } ${ h }:${ m }` );
    }
  },
});
