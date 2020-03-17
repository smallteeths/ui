import Component from '@ember/component';
import layout from './template';
import Provider from 'global-admin/mixins/thanos-storage-provider';


export const answers = {
  bucketName:          'thanos.objectConfig.config.container',
  endpoint:            'thanos.objectConfig.config.endpoint',
  storageAccount:      'thanos.objectConfig.config.storage_account',
  storageAccountKey:   'thanos.objectConfig.config.storage_account_key',
  maxRetries:          'thanos.objectConfig.config.max_retries',
}

const defaults = { maxRetries: 0,  }

export default Component.extend(Provider, {
  layout,
  answers,
  name:            'azure',
  defaults,
});
