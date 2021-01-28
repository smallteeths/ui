import Resource from '@rancher/ember-api-store/models/resource';
import { get, computed, set } from '@ember/object';

var Pool = Resource.extend({
  type:    'pool',

  isWorkload: computed('service', function() {
    console.log('=========================================')

    return this.get('service');
  }),
});

export default Pool;
