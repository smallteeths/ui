import Resource from '@rancher/ember-api-store/models/resource';
import { computed } from '@ember/object';
import { notEmpty } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import { hasMany } from '@rancher/ember-api-store/utils/denormalize';

const cloudCredential = Resource.extend({
  modal:         service(),
  globalStore:    service(),
  nodeTemplates: hasMany('id', 'nodetemplate', 'cloudCredentialId', 'globalStore'),

  type: 'cloudCredential',

  canClone: false,
  canEdit:  true,

  isAlibaba:   notEmpty('aliyunecscredentialConfig'),
  isAmazon:    notEmpty('amazonec2credentialConfig'),
  isAzure:     notEmpty('azurecredentialConfig'),
  isDo:        notEmpty('digitaloceancredentialConfig'),
  isGoogle:    notEmpty('googlecredentialConfig'),
  isHarvester: notEmpty('harvestercredentialConfig'),
  isLinode:    notEmpty('linodecredentialConfig'),
  isOCI:       notEmpty('ocicredentialConfig'),
  isPNAP:      notEmpty('pnapcredentialConfig'),
  isVMware:    notEmpty('vmwarevspherecredentialConfig'),
  isTencent:   notEmpty('tkecredentialConfig'),
  isHuawei:    notEmpty('huaweicredentialConfig'),

  numberOfNodeTemplateAssociations: computed.reads('nodeTemplates.length'),

  displayType: computed('aliyunecscredentialConfig', 'amazonec2credentialConfig', 'azurecredentialConfig', 'digitaloceancredentialConfig', 'harvestercredentialConfig', 'googlecredentialConfig', 'linodecredentialConfig', 'ocicredentialConfig', 'pnapcredentialConfig', 'vmwarevspherecredentialConfig', 'tkecredentialConfig', 'huaweicredentialConfig', function() {
    const {
      isAlibaba,
      isAmazon,
      isAzure,
      isDo,
      isGoogle,
      isLinode,
      isOCI,
      isPNAP,
      isVMware,
      isHarvester,
      isTencent,
      isHuawei,
    } = this;

    if (isAlibaba) {
      return 'Alibaba';
    } else if (isAmazon) {
      return 'Amazon';
    } else if (isAzure) {
      return 'Azure';
    } else if (isDo) {
      return 'Digital Ocean';
    } else if (isGoogle) {
      return 'Google';
    } else if (isLinode) {
      return 'Linode';
    } else if (isOCI) {
      return 'OCI';
    } else if (isPNAP) {
      return 'phoenixNAP';
    } else if (isVMware) {
      return 'VMware vSphere';
    } else if (isHarvester) {
      return 'Harvester'
    } else if (isTencent) {
      return 'Tencent'
    } else if (isHuawei) {
      return 'Huawei'
    }

    return '';
  }),

  actions: {
    edit() {
      this.modal.toggleModal('modal-add-cloud-credential', {
        cloudCredential: this,
        mode:            'edit',
      });
    }
  },
});

export default cloudCredential;
