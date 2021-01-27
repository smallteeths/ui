import Resource from '@rancher/ember-api-store/models/resource';
import { reference } from '@rancher/ember-api-store/utils/denormalize';

var Pool = Resource.extend({
  type:    'pool',
  service: reference('serviceId'),
});

export default Pool;
