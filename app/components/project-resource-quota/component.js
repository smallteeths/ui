import {  get, set, observer } from '@ember/object';
import Component from '@ember/component';
import { convertToMillis } from 'shared/utils/util';
import { parseSi } from 'shared/utils/parse-unit';
import layout from './template';

export default Component.extend({
  layout,

  limit:          null,
  nsDefaultLimit: null,
  editing:        null,

  quotaArray: null,

  storageClassKey: ['requestsStorageClassStorage', 'requestsStorageClassPVC'],

  init() {
    this._super(...arguments);

    this.initQuotaArray();
  },

  actions: {
    addQuota() {
      get(this, 'quotaArray').pushObject({
        key:            '',
        projectLimit:   '',
        namespaceLimit: '',
      });
    },

    removeQuota(quota){
      get(this, 'quotaArray').removeObject(quota);
    }
  },

  quotaDidChange: observer('quotaArray.@each.{key,projectLimit,namespaceLimit}', function() {
    const limit = {};
    const nsDefaultLimit = {};
    const storageClassKey = get(this, 'storageClassKey');

    (get(this, 'quotaArray') || []).forEach((quota) => {
      if ( quota.key && (quota.projectLimit || quota.namespaceLimit) ) {
        if (storageClassKey.find((scKey) => scKey === quota.key)){
          this.setStorageClassSubmitQuota(quota, limit, nsDefaultLimit)

          return;
        }
        limit[quota.key] = this.convertToString(quota.key, quota.projectLimit);
        nsDefaultLimit[quota.key] = this.convertToString(quota.key, quota.namespaceLimit);
      }
    });

    let out = null;

    if ( Object.keys(limit).length ) {
      out = {
        resourceQuota:                 { limit },
        namespaceDefaultResourceQuota: { limit: nsDefaultLimit },
      }
    }

    if (this.changed) {
      this.changed(out);
    }
  }),

  convertToString(key, value) {
    if ( !value && value !== 0 ) {
      return '';
    }

    switch (key) {
    case 'limitsCpu':
    case 'requestsCpu':
      return `${ value }m`;
    case 'limitsMemory':
    case 'requestsMemory':
      return `${ value }Mi`;
    case 'requestsStorage':
      return `${ value }Gi`;
    default:
      return value;
    }
  },

  convertToLimit(key, value) {
    if ( !value ) {
      return '';
    }

    switch (key) {
    case 'limitsCpu':
    case 'requestsCpu':
      return convertToMillis(value);
    case 'limitsMemory':
    case 'requestsMemory':
      return parseSi(value, 1024) / 1048576;
    case 'requestsStorage':
      return parseSi(value) / (1024 ** 3);
    default:
      return value;
    }
  },

  initQuotaArray() {
    const limit = get(this, 'limit') || {};
    const nsDefaultLimit = get(this, 'nsDefaultLimit') || {};
    const array = [];

    Object.keys(limit).forEach((key) => {
      if ( key !== 'type' && typeof limit[key] ===  'string' ) {
        const projectLimit = this.convertToLimit(key, limit[key]);
        const namespaceLimit = this.convertToLimit(key, nsDefaultLimit[key]);

        array.push({
          key,
          projectLimit,
          namespaceLimit,
        });
      } else {
        this.initStorageClassQuota(key, array);
      }
    });

    set(this, 'quotaArray', array);
  },
  initStorageClassQuota(key, array){
    const storageClassKey   = get(this, 'storageClassKey');
    const limit             = get(this, 'limit') || {};
    const nsDefaultLimit    = get(this, 'nsDefaultLimit') || {};

    if (storageClassKey.find((scKey) => scKey === key)){
      Object.keys(limit[key]).forEach((subKey) => {
        const projectLimit = this.convertToLimit(key, limit[key][subKey]);
        const namespaceLimit = this.convertToLimit(key, nsDefaultLimit[key][subKey]);

        array.push({
          subKey,
          key,
          projectLimit,
          namespaceLimit,
        });
      });
    }
  },
  setStorageClassSubmitQuota(quota, limit, nsDefaultLimit){
    limit[quota.key]          = limit[quota.key] || {};
    nsDefaultLimit[quota.key] = nsDefaultLimit[quota.key] || {};

    if (quota.subKey){
      set(limit[quota.key], quota.subKey, this.convertToString(quota.key, quota.projectLimit));
      set(nsDefaultLimit[quota.key], quota.subKey, this.convertToString(quota.key, quota.namespaceLimit));
    }
  }
});
