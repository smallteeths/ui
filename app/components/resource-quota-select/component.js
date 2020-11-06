import C from 'ui/utils/constants';
import {  get, set, observer } from '@ember/object';
import Component from '@ember/component';
import { next } from '@ember/runloop';
import layout from './template';
import { inject as service } from '@ember/service';

export default Component.extend({
  clusterStore: service(),

  layout,

  resourceChoices:    null,
  allResourceChoices: null,

  storageClassChoices:    null,
  allstorageClassChoices: null,

  init() {
    this._super(...arguments);
    this.initResourceChoices();
    this.initStorageClassChoices();
  },

  currentQuotaDidChange: observer('currentQuota.@each.key', function() {
    set(this, 'storageClassChoices', get(this, 'allstorageClassChoices').filter((choice) => this.doesExistStorageClass(choice)));
    set(this, 'resourceChoices', get(this, 'allResourceChoices').filter((choice) => this.doesExist(choice) || this.showStorageclassOption(choice)));
  }),

  doesExist(choice) {
    return get(choice, 'value') === get(this, 'quota.key') || !(get(this, 'currentQuota') || []).findBy('key', get(choice, 'value'));
  },

  doesExistStorageClass(choice) {
    return get(choice, 'value') === get(this, 'quota.subKey') || !(get(this, 'currentQuota') || []).filter((resource) => resource.key === get(this, 'quota.key')).findBy('subKey', get(choice, 'value'));
  },

  showStorageclassOption(choice){
    return get(choice, 'value') === 'requestsStorageClassStorage' || get(choice, 'value') === 'requestsStorageClassPVC';
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
    set(this, 'storageClassChoices', choices.filter((choice) => this.doesExistStorageClass(choice)));
  }
});
