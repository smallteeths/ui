import Component from '@ember/component';
import layout from './template';
import Provider from 'global-admin/mixins/thanos-storage-provider';

export const answers = {
  bucketName:     'thanos.objectConfig.config.bucket',
  serviceAccount:  'thanos.objectConfig.config.service_account',
}

export default Component.extend(Provider, {
  layout,
  answers,
  name: 'gcs'
});
