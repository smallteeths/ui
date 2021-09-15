import Service, { inject as service } from '@ember/service';
import { normalizeType } from '@rancher/ember-api-store/utils/normalize';
import { reject } from 'rsvp';
import ApiError from '@rancher/ember-api-store/models/error';

export default Service.extend({
  store: service(),
  scope: service(),

  findAll(type, namespaceId) {
    type = normalizeType(type, this.store);

    return this.store.find('schema', type, { url: `schemas/${ encodeURIComponent(type) }` }).then((schema) => {
      if ( schema ) {
        var url = schema.linkFor('collection');

        if ( url ) {
          return this.store._findWithUrl(`${ url }${ namespaceId  ? `?namespaceId=${ encodeURIComponent(namespaceId) }` : '' }`, type, {
            isForAll:      true,
            removeMissing: true,
          }).then(() => {
            return this.store.all(type)
          });
        }
      }

      return reject(ApiError.create({ detail: `Unable to find schema for "${  type  }"` }));
    });
  }
});
