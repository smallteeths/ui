import C from 'ui/utils/constants';
import { get, set, observer } from '@ember/object';
import Component from '@ember/component';
import { next } from '@ember/runloop';
import layout from './template';
import { inject as service } from '@ember/service';

export default Component.extend({
  clusterStore: service(),
  intl:         service(),

  layout,

  resourceChoices:    null,
  allResourceChoices: null,

  storageClassChoices:    null,
  allstorageClassChoices: null,
  subkeyDisabled:         false,

  storageClassKey: ['requestsStorageClassStorage', 'requestsStorageClassPVC'],

  init() {
    this._super(...arguments);
    this.initStorageClassChoices();
    this.initResourceChoices();
  },

  currentQuotaDidChange: observer('currentQuota.@each.{key,subKey}', function() {
    !get(this, 'subkeyDisabled') && set(this, 'storageClassChoices', get(this, 'allstorageClassChoices').filter((choice) => this.doesExistStorageClass(choice, get(this, 'quota.key'))));
    set(this, 'resourceChoices', this.allResourceChoices.filter((choice) => this.doesExist(choice) || this.showStorageclassOption(choice)));
  }),

  quotaKeyDidChange: observer('storageClassChoices', function(){
    let key = get(this, 'quota.key');

    if (get(this, 'storageClassKey').find((scKey) => scKey === key)) {
      if ( get(this, 'storageClassChoices.length') && !get(this, 'quota.subKey') ) {
        next(() => {
          set(this, 'quota.subKey', get(this, 'storageClassChoices.firstObject.value'));
        });
      }
    }
  }),

  doesExist(choice) {
    return get(choice, 'value') === get(this, 'quota.key') || !(this.currentQuota || []).findBy('key', get(choice, 'value'));
  },

  doesExistStorageClass(choice, quotaKey) {
    return get(choice, 'value') === get(this, 'quota.subKey') || !(get(this, 'currentQuota') || []).filter((resource) => resource.key === quotaKey).findBy('subKey', get(choice, 'value'));
  },

  showStorageclassOption(choice){
    return get(this, 'storageClassKey').find((scKey) => {
      return scKey === get(choice, 'value') &&
      get(this, 'allstorageClassChoices').filter((choice) => !(get(this, 'currentQuota') || []).filter((resource) => resource.key === scKey).findBy('subKey', get(choice, 'value'))).length;
    });
  },

  initResourceChoices() {
    const choices = [];

    C.RESOURCE_QUOTAS.forEach((key) => {
      choices.push({
        label: `formResourceQuota.resources.${ key }`,
        value: key,
      });
    });

    set(this, 'allResourceChoices', choices);

    set(this, 'resourceChoices', get(this, 'allResourceChoices').filter((choice) => this.doesExist(choice) || this.showStorageclassOption(choice)));

    if ( get(this, 'resourceChoices.length') && !get(this, 'quota.key') ) {
      next(() => {
        set(this, 'quota.key', get(this, 'resourceChoices.firstObject.value'));
      });
    }
  },

  initStorageClassChoices(){
    const choices = [];

    get(this, 'clusterStore').all('storageclass').forEach((item) => {
      choices.push({
        label: item.name,
        value: item.id,
      });
    });
    set(this, 'allstorageClassChoices', choices);
    set(this, 'storageClassChoices', choices.filter((choice) => this.doesExistStorageClass(choice, get(this, 'quota.key'))));
    this.setLabel();
  },

  setLabel(){
    const subKey = get(this, 'quota.subKey');
    const allstorageClassChoices = get(this, 'allstorageClassChoices');
    const intl = get(this, 'intl')

    if (!subKey){
      return '';
    }
    const currentStorageClass = allstorageClassChoices.find((choice) => choice.value === get(this, 'quota.subKey'));

    if (!currentStorageClass){
      set(this, 'subkeyDisabled', true);
      this.storageClassChoices && this.storageClassChoices.push({
        value: subKey,
        label: `${ get(this, 'quota.subKey') }(${ intl.t('formResourceQuota.table.projectLimit.stroageClassPlaceholder') })`
      })
    }
  },
});
