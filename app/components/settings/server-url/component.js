import Component from '@ember/component';
import layout from './template';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { isEmpty } from '@ember/utils';
import { next } from '@ember/runloop';
import $ from 'jquery';

const SCHEME = 'https://';

export default Component.extend({
  router:           service(),
  settings:         service(),
  globalStore:      service(),

  layout,

  cancel:            null,
  popupMode:        false,
  initServerUrl:    null,
  serverUrl:        null,
  serverUrlSetting: null,
  setServerUrl:     false,
  showHeader:       true,
  urlInvalid:       false,
  urlWarning:       null,
  scheme:           SCHEME,


  init() {
    this._super(...arguments);
    const initServerUrl = get(this, 'initServerUrl');

    if ( isEmpty(initServerUrl) ) {
      set(this, 'serverUrl', window.location.host);
    } else {
      set(this, 'serverUrl', initServerUrl);
    }
  },
  didInsertElement() {
    next(() => {
      if ( this.isDestroyed || this.isDestroying ) {
        return;
      }

      const elem = $('INPUT')[0]

      if ( elem ) {
        elem.focus();
      }
    });
  },

  actions: {
    saveServerUrl() {
      let setting = get(this, 'serverUrlSetting');

      set(setting, 'value', `${ SCHEME }${ get(this, 'serverUrl') }`);
      setting.save().then(() => {
        if ( !get(this, 'popupMode') ) {
          this.activeDrivers();
          get(this, 'router').replaceWith('authenticated');
        } else {
          this.send('cancel');
        }
      });
    },

    cancel() {
      if (this.cancel) {
        this.cancel();
      }
    }
  },
  activeDrivers() {
    Promise.all([
      this.get('globalStore').findAll('kontainerDriver'),
      this.get('globalStore').findAll('nodeDriver')
    ]).then(([kDrivers, nDrivers]) => {
      const cnKDrivers = ['aliyunkubernetescontainerservice', 'huaweicontainercloudengine', 'baiducloudcontainerengine', 'tencentkubernetesengine', 'azurekubernetesservice', 'rancherkubernetesengine'];
      const cnNDrivers = ['aliyunecs', 'pinganyunecs', 'vmwarevsphere', 'openstack'];

      kDrivers.forEach((kd) => {
        if (cnKDrivers.indexOf(kd.id) !== -1) {
          if (kd.state !== 'active' && kd.state !== 'downloading') {
            kd.doAction('activate');
          }
        } else {
          if (kd.state === 'active') {
            kd.doAction('deactivate');
          }
        }
      });
      nDrivers.forEach((nd) => {
        if (cnNDrivers.indexOf(nd.id) !== -1) {
          if (nd.state !== 'active' && nd.state !== 'downloading') {
            nd.doAction('activate');
          }
        } else {
          if (nd.state === 'active') {
            nd.doAction('deactivate');
          }
        }
      });
    });
  },
});
