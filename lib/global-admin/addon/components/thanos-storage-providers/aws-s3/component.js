import Component from '@ember/component';
import layout from './template';
import Provider from 'global-admin/mixins/thanos-storage-provider';

export const answers = {
  bucketName: 'thanos.objectConfig.config.bucket',
  endpoint:   'thanos.objectConfig.config.endpoint',
  accessKey:  'thanos.objectConfig.config.access_key',
  secretKey:  'thanos.objectConfig.config.secret_key'
}

export default Component.extend(Provider, {
  layout,
  answers,
  name: 's3'
});
