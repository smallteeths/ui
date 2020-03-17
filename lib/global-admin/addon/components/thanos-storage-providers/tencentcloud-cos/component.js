import Component from '@ember/component';
import layout from './template';
import Provider from 'global-admin/mixins/thanos-storage-provider';


export const answers = {
  bucketName: 'thanos.objectConfig.config.bucket',
  region:     'thanos.objectConfig.config.region',
  secretKey:  'thanos.objectConfig.config.secret_key',
  secretId:   'thanos.objectConfig.config.secret_id',
  appid:      'thanos.objectConfig.config.app_id'
}

export default Component.extend(Provider, {
  layout,
  answers,
  name:            'tencentcloudcos'
});
