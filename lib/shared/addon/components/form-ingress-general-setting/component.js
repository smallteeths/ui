import { get, set, observer, setProperties } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import layout from './template';

const REWRITE_TARGET = 'nginx.ingress.kubernetes.io/rewrite-target';
const SSL_REDIRECT = 'nginx.ingress.kubernetes.io/ssl-redirect';
const PROXY_BUFFERING = 'nginx.ingress.kubernetes.io/proxy-buffering';
const PROXY_BUFFER_SIZE = 'nginx.ingress.kubernetes.io/proxy-buffer-size';
const WHITELIST_SOURCE_RANGE = 'nginx.ingress.kubernetes.io/whitelist-source-range';
const PERMANENT_REDIRECT  = 'nginx.ingress.kubernetes.io/permanent-redirect'
const PERMANENT_REDIRECT_CODE  = 'nginx.ingress.kubernetes.io/permanent-redirect-code'
const PROXY_BODY_SIZE = 'nginx.ingress.kubernetes.io/proxy-body-size';
const LIMIT_RPS = 'nginx.ingress.kubernetes.io/limit-rps';

export default Component.extend({
  intl: service(),

  layout,
  editing:                null,
  ingress:                null,
  errors:                 null,
  generalSetting:       {},
  inputOptions:     [
    {
      key:     'rewriteTarget',
      annoKey: REWRITE_TARGET,
      default: null,
    }, {
      key:     'sslRedirect',
      annoKey: SSL_REDIRECT,
      default: 'true',
    }, {
      key:     'proxyBuffering',
      annoKey: PROXY_BUFFERING,
      default: 'off',
    }, {
      key:     'whitelist',
      annoKey: WHITELIST_SOURCE_RANGE,
      default: null,
    }, {
      key:     'permanentRedirect',
      annoKey: PERMANENT_REDIRECT,
      default: null,
    }, {
      key:     'permanentRedirectCode',
      annoKey: PERMANENT_REDIRECT_CODE,
      default: null,
    }, {
      key:     'limitRps',
      annoKey: LIMIT_RPS,
      default: null,
    }
  ],

  unitInputOptions: [
    {
      key:     'proxyBufferSize',
      annoKey: PROXY_BUFFER_SIZE,
      default: null,
      unit:    'k',
    },
    {
      key:     'proxyBodySize',
      annoKey: PROXY_BODY_SIZE,
      default: null,
      unit:    'm',
    }
  ],

  init() {
    this._super(...arguments);
    const certs = get(this, 'ingress.tls') || [];

    set(this, 'certs', certs);

    this.initgeneralSetting();
  },

  inputDidChange: observer('generalSetting.{rewriteTarget,sslRedirect,proxyBuffering,whitelist,permanentRedirect,permanentRedirectCode,limitRps}', function() {
    const errors = [];
    const intl = get(this, 'intl');
    const anno = get(this, 'ingress.annotations') || {};

    this.inputOptions.forEach((item) => {
      if (this.generalSetting[item.key]){
        anno[item.annoKey] = this.generalSetting[item.key]
      } else {
        if (item.default){
          anno[item.annoKey] = item.default
        } else {
          delete anno[item.annoKey]
        }
      }
    })

    if (anno[PROXY_BUFFERING] === 'off'){
      delete anno[PROXY_BUFFERING];
      anno[PROXY_BUFFER_SIZE] && delete anno[PROXY_BUFFER_SIZE];
    }

    if (anno[SSL_REDIRECT] === 'true'){
      delete anno[SSL_REDIRECT];
    }

    const cidrIPV4RegExp = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/\d{1,2}$/;
    const IPV4RegExp = /^((2[0-4]\d|25[0-5]|[01]?\d\d?)\.){3}(2[0-4]\d|25[0-5]|[01]?\d\d?)$/

    if (anno[WHITELIST_SOURCE_RANGE]){
      const whitelist = anno[WHITELIST_SOURCE_RANGE].split(',');

      whitelist.forEach((item) => {
        if (!cidrIPV4RegExp.test(item) && !IPV4RegExp.test(item)) {
          errors.push(intl.t('formIngressGeneralSetting.whitelist.formalError'));
        }
      })
    }

    set(this, 'ingress.annotations', anno);
    setProperties(this, { errors: errors.uniq() });
  }),

  unitInputDidChange: observer('generalSetting.{proxyBufferSize,proxyBodySize}', function() {
    const errors = [];
    const anno = get(this, 'ingress.annotations') || {};

    this.unitInputOptions.forEach((item) => {
      if (this.generalSetting[item.key]){
        anno[item.annoKey] = this.generalSetting[item.key] + item.unit;
      } else {
        if (item.default){
          anno[item.annoKey] = item.default;
        } else {
          anno[item.annoKey] && delete anno[item.annoKey];
        }
      }
    })

    set(this, 'ingress.annotations', anno);
    setProperties(this, { errors: errors.uniq() });
  }),

  initgeneralSetting(){
    const anno = get(this, 'ingress.annotations') || {};
    const out = {};

    this.inputOptions.forEach((item) => {
      if (anno[item.annoKey]){
        out[item.key] = anno[item.annoKey];
      } else {
        if (item.default){
          out[item.key] = item.default;
        }
      }
    });

    this.unitInputOptions.forEach((item) => {
      if (anno[item.annoKey]){
        out[item.key] = parseInt(anno[item.annoKey], 10);
      } else {
        if (item.default){
          out[item.key] = parseInt(item.default, 10);
        }
      }
    });

    set(this, 'generalSetting', out);
  }

});
