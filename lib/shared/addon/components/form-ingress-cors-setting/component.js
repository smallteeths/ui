import { get, set, setProperties } from '@ember/object';
import { debouncedObserver } from 'ui/utils/debounce';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import layout from './template';

const ENABLE_CORS  = 'nginx.ingress.kubernetes.io/enable-cors'
const CORS_ALLOW_METHODS = 'nginx.ingress.kubernetes.io/cors-allow-methods';
const CORS_ALLOW_HEADERS = 'nginx.ingress.kubernetes.io/cors-allow-headers';
const CORS_EXPOSE_HEADERS = 'nginx.ingress.kubernetes.io/cors-expose-headers';
const CORS_ALLOW_ORIGIN = 'nginx.ingress.kubernetes.io/cors-allow-origin';
const CORS_ALLOW_CREDENTIALS = 'nginx.ingress.kubernetes.io/cors-allow-credentials';
const CORS_MAX_AGE = 'nginx.ingress.kubernetes.io/cors-max-age';

export default Component.extend({
  intl: service(),

  layout,
  editing:                null,
  ingress:                null,
  errors:                 null,
  ingressCors:            { allowMethods: {}, },
  inputOptions:     [
    {
      key:     'strategy',
      annoKey: ENABLE_CORS,
      default: 'false',
    }, {
      key:     'allowMethods',
      annoKey: CORS_ALLOW_METHODS,
      default: null,
    }, {
      key:     'allowCredential',
      annoKey: CORS_ALLOW_CREDENTIALS,
      default: 'true',
    }, {
      key:     'maxAge',
      annoKey: CORS_MAX_AGE,
      default: null,
    }
  ],

  multiLineOptions: [
    {
      key:       'allowHeader',
      annoKey:   CORS_ALLOW_HEADERS,
      multiLine: true,
      default:   null,
    }, {
      key:       'exposeHeader',
      annoKey:   CORS_EXPOSE_HEADERS,
      multiLine: true,
      default:   null,
    }, {
      key:       'allowOrigin',
      annoKey:   CORS_ALLOW_ORIGIN,
      multiLine: true,
      default:   null,
    }
  ],

  init() {
    this._super(...arguments);

    this.initIngressCors();
  },

  inputDidChange: debouncedObserver('ingressCors.{strategy,allowCredential,maxAge}', 'ingressCors.allowMethods.{get,post,put,delete,patch,options}', function() {
    const errors = [];
    const intl = get(this, 'intl');
    const anno = get(this, 'ingress.annotations') || {};
    const allowMethods = get(this, 'ingressCors.allowMethods') || [];

    if (get(this, 'ingressCors.strategy') === 'false'){
      this.inputOptions.forEach((item) => {
        if (anno[item.annoKey]){
          delete anno[item.annoKey];
        }
      });

      this.multiLineOptions.forEach((item) => {
        if (anno[item.annoKey]){
          delete anno[item.annoKey];
        }
      });

      set(this, 'ingress.annotations', anno);

      return;
    }

    if (!Object.keys(allowMethods).find((key) => allowMethods[key])){
      errors.push(intl.t('formSslClientAuth.corsAllowMethod.required'));
    }

    this.inputOptions.forEach((item) => {
      if (this.ingressCors[item.key]){
        anno[item.annoKey] = this.ingressCors[item.key]
      } else {
        if (item.default){
          anno[item.annoKey] = item.default
        } else {
          anno[item.annoKey] && delete anno[item.annoKey];
        }
      }
    });

    if (anno[CORS_ALLOW_CREDENTIALS] === 'true'){
      delete anno[CORS_ALLOW_CREDENTIALS];
    }

    const allowMethodKeys = []

    Object.keys(allowMethods).forEach((key) => {
      if (allowMethods[key]){
        allowMethodKeys.push(key.toLocaleUpperCase());
      }
    });

    if (allowMethodKeys.length === 6){
      anno[CORS_ALLOW_METHODS] && delete anno[CORS_ALLOW_METHODS];
    } else {
      anno[CORS_ALLOW_METHODS] = allowMethodKeys.join(',');
    }

    set(this, 'ingress.annotations', anno);
    setProperties(this, { errors: errors.uniq() });
  }),

  multiLineDidChange: debouncedObserver('ingressCors.{allowHeader,exposeHeader,allowOrigin}', function() {
    const anno = get(this, 'ingress.annotations') || {};

    this.multiLineOptions.forEach((item) => {
      if (this.ingressCors[item.key]){
        anno[item.annoKey] = this.ingressCors[item.key].trim().replace(/\n/g, ',');
      } else {
        if (item.default){
          anno[item.annoKey] = item.default
        } else {
          anno[item.annoKey] && delete anno[item.annoKey];
        }
      }
    });

    set(this, 'ingress.annotations', anno);
  }),

  initIngressCors(){
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

    if (!this.editing){
      this.multiLineOptions.forEach((item) => {
        if (anno[item.annoKey]){
          out[item.key] = anno[item.annoKey];
        } else {
          if (item.default){
            out[item.key] = item.default;
          }
        }
      });
    } else {
      this.multiLineOptions.forEach((item) => {
        if (anno[item.annoKey]){
          out[item.key] = anno[item.annoKey].replace(/,/g, '\n');
        } else {
          if (item.default){
            out[item.key] = item.default.replace(/,/g, '\n');
          }
        }
      });
    }


    if (out.allowMethods){
      const m = {};

      out.allowMethods.split(',').forEach((item) => {
        m[item.toLowerCase()] = true
      })

      out.allowMethods = m;
    } else {
      out.allowMethods = {
        get:     true,
        post:    true,
        put:     true,
        delete:  true,
        patch:   true,
        options: true,
      }
    }

    set(this, 'ingressCors', out);
  }

});
