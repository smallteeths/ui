import Component from '@ember/component';
import layout from './template';
import Provider from 'global-admin/mixins/thanos-storage-provider';

export const answers = {
  bucketName: 'thanos.objectConfig.config.bucket',
  endpoint:   'thanos.objectConfig.config.endpoint',
  accessKey:  'thanos.objectConfig.config.access_key_id',
  secretKey:  'thanos.objectConfig.config.access_key_secret'
}

const ENDPOINTS = [
  {
    value: 'oss-cn-hangzhou.aliyuncs.com',
    label: 'globalMonitoringPage.store.aliyunoss.endpoint.hangzhou'
  },
  {
    value: 'oss-cn-shanghai.aliyuncs.com',
    label: 'globalMonitoringPage.store.aliyunoss.endpoint.shanghai'
  },
  {
    value: 'oss-cn-qingdao.aliyuncs.com',
    label: 'globalMonitoringPage.store.aliyunoss.endpoint.qingdao'
  },
  {
    value: 'oss-cn-beijing.aliyuncs.com',
    label: 'globalMonitoringPage.store.aliyunoss.endpoint.beijing'
  },
  {
    value: 'oss-cn-zhangjiakou.aliyuncs.com',
    label: 'globalMonitoringPage.store.aliyunoss.endpoint.zhangjiakou'
  },
  {
    value: 'oss-cn-huhehaote.aliyuncs.com',
    label: 'globalMonitoringPage.store.aliyunoss.endpoint.huhehaote'
  },
  {
    value: 'oss-cn-shenzhen.aliyuncs.com',
    label: 'globalMonitoringPage.store.aliyunoss.endpoint.shenzhen'
  },
  {
    value: 'oss-cn-heyuan.aliyuncs.com',
    label: 'globalMonitoringPage.store.aliyunoss.endpoint.heyuan'
  },
  {
    value: 'oss-cn-chengdu.aliyuncs.com',
    label: 'globalMonitoringPage.store.aliyunoss.endpoint.chengdu'
  },
  {
    value: 'oss-cn-hongkong.aliyuncs.com',
    label: 'globalMonitoringPage.store.aliyunoss.endpoint.hongkong'
  },
  {
    value: 'oss-us-west-1.aliyuncs.com',
    label: 'globalMonitoringPage.store.aliyunoss.endpoint.west-1'
  },
  {
    value: 'oss-us-east-1.aliyuncs.com',
    label: 'globalMonitoringPage.store.aliyunoss.endpoint.east-1'
  },
  {
    value: 'oss-ap-southeast-1.aliyuncs.com',
    label: 'globalMonitoringPage.store.aliyunoss.endpoint.southeast-1'
  },
  {
    value: 'oss-ap-southeast-2.aliyuncs.com',
    label: 'globalMonitoringPage.store.aliyunoss.endpoint.southeast-2'
  },
  {
    value: 'oss-ap-southeast-3.aliyuncs.com',
    label: 'globalMonitoringPage.store.aliyunoss.endpoint.southeast-3'
  },
  {
    value: 'oss-ap-southeast-5.aliyuncs.com',
    label: 'globalMonitoringPage.store.aliyunoss.endpoint.southeast-5'
  },
  {
    value: 'oss-ap-northeast-1.aliyuncs.com',
    label: 'globalMonitoringPage.store.aliyunoss.endpoint.northeast-1'
  },
  {
    value: 'oss-ap-south-1.aliyuncs.com',
    label: 'globalMonitoringPage.store.aliyunoss.endpoint.south-1'
  },
  {
    value: 'oss-eu-central-1.aliyuncs.com',
    label: 'globalMonitoringPage.store.aliyunoss.endpoint.eu-central-1'
  },
  {
    value: 'oss-eu-west-1.aliyuncs.com',
    label: 'globalMonitoringPage.store.aliyunoss.endpoint.eu-west-1'
  },
  {
    value: 'oss-me-east-1.aliyuncs.com',
    label: 'globalMonitoringPage.store.aliyunoss.endpoint.me-east-1'
  },
]

export default Component.extend(Provider, {
  layout,
  answers,
  name:            'aliyunoss',
  endpointChoices: ENDPOINTS,
  endpoint:        ENDPOINTS[0].value,
});
