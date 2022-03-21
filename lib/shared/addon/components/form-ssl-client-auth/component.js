import { get, set, computed, setProperties } from '@ember/object';
import { debouncedObserver } from 'ui/utils/debounce';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import layout from './template';

const AUTH_TLS_VERIFY_CLIENT  = 'nginx.ingress.kubernetes.io/auth-tls-verify-client'
const AUTH_TLS_SECRET = 'nginx.ingress.kubernetes.io/auth-tls-secret';
const AUTH_TLS_ERROR_PAGE = 'nginx.ingress.kubernetes.io/auth-tls-error-page';
const AUTH_TLS_VERIFY_DEPTH = 'nginx.ingress.kubernetes.io/auth-tls-verify-depth';

export default Component.extend({
  intl: service(),

  layout,
  editing:                null,
  ingress:                null,
  errors:                 null,
  clientAuthSecert:       null,
  clinetAuth:       {},
  inputOptions:     [
    {
      key:     'strategy',
      annoKey: AUTH_TLS_VERIFY_CLIENT,
      default: 'off',
    }, {
      key:     'secret',
      annoKey: AUTH_TLS_SECRET,
      default: null,
    }, {
      key:     'errorPage',
      annoKey: AUTH_TLS_ERROR_PAGE,
      default: null,
    }, {
      key:     'depth',
      annoKey: AUTH_TLS_VERIFY_DEPTH,
      default: null,
    }
  ],

  init() {
    this._super(...arguments);
    const certs = get(this, 'ingress.tls') || [];

    set(this, 'certs', certs);

    this.initClinetAuth();
  },

  inputDidChange: debouncedObserver('clinetAuth.{strategy,secret,errorPage,depth}', function() {
    const errors = [];
    const intl = get(this, 'intl');
    const anno = get(this, 'ingress.annotations') || {};

    if (get(this, 'clinetAuth.strategy') === 'off'){
      this.inputOptions.forEach((item) => {
        if (anno[item.annoKey]){
          delete anno[item.annoKey]
        }
      })

      set(this, 'ingress.annotations', anno);

      return;
    }

    if (!this.clinetAuth.secret){
      errors.push(intl.t('formSslClientAuth.secret.required'));
    }

    this.inputOptions.forEach((item) => {
      if (this.clinetAuth[item.key]){
        anno[item.annoKey] = this.clinetAuth[item.key]
      } else {
        if (item.default){
          anno[item.annoKey] = item.default
        } else {
          delete anno[item.annoKey]
        }
      }
    });

    set(this, 'ingress.annotations', anno);
    setProperties(this, { errors: errors.uniq() });
  }),

  secretChoise: computed('clientAuthSecert.[]', function() {
    return (this.clientAuthSecert || []).map((item) => {
      return {
        value: `${ item.namespaceId || 'default' }/${ item.name }`,
        label: `${ item.name }(${ item.namespaceId || 'default' })`
      }
    });
  }),

  initClinetAuth(){
    const anno = get(this, 'ingress.annotations') || {};
    const out = {};

    if (anno[AUTH_TLS_VERIFY_CLIENT]){
      out.strategy = anno[AUTH_TLS_VERIFY_CLIENT];
    } else {
      out.strategy = 'off';
    }

    if (anno[AUTH_TLS_SECRET]){
      out.secret = anno[AUTH_TLS_SECRET];
    } else {
      if (get(this, 'secretChoise.length')){
        out.secret = get(this, 'secretChoise.firstObject.value');
      }
    }

    if (anno[AUTH_TLS_ERROR_PAGE]){
      out.errorPage = anno[AUTH_TLS_ERROR_PAGE];
    }

    if (anno[AUTH_TLS_VERIFY_DEPTH]){
      out.depth = anno[AUTH_TLS_VERIFY_DEPTH];
    }

    set(this, 'clinetAuth', out);
  }

});
