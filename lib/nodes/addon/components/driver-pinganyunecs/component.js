import { alias } from '@ember/object/computed';
import Driver from 'shared/mixins/node-driver';
import {
  get, set, observer, setProperties, computed
} from '@ember/object';
import Component from '@ember/component';
import layout from './template';
import { inject as service } from '@ember/service';
import { reject, all } from 'rsvp';

function randomNumbers(count) {
  var num = '';

  for (var i = 0; i < count; i++) {
    num += Math.floor(Math.random() * 10);
  }

  return num;
}

export default Component.extend(Driver, {
  intl:               service(),
  layout,
  driverName:          'pinganyunecs',
  zones:             null,
  pods:              null,
  vpcs:              null,
  regions:           null,
  securityGroups:    null,
  zoneAvailableIps:  0,
  networks:          null,
  productSeries:     null,
  ebsTypes:          null,
  instanceTypes:     null,
  osTypes:           null,
  osTypeId:          null,
  images:            null,
  useType:           'PUBLIC', // PUBLIC, SPECIAL
  useTypes:         [{
    value: 'PUBLIC',
    label: 'Regular Image'
  }, {
    value: 'SPECIAL',
    label: 'Customized Image'
  }],
  productSeriesId:    null,
  confirmPassword:    null,
  step:              1,
  pinganyunApi:      'api.yun.pingan.com/api/v1',
  config:            alias('model.pinganyunecsConfig'),

  willDestroyElement() {
    set(this, 'errors', null);
    set(this, 'step', 1);
  },

  actions: {
    showNetworkConfig(cb) {
      setProperties(this, {
        'errors':                 null,
        'config.accessKeyId':     (get(this, 'config.accessKeyId') || '').trim(),
        'config.accessKeySecret': (get(this, 'config.accessKeySecret') || '').trim(),
      });

      const errors = get(this, 'errors') || [];
      const intl = get(this, 'intl');

      const accessKey = get(this, 'config.accessKeyId');
      const accessSecret = get(this, 'config.accessKeySecret');

      if (!accessKey) {
        errors.push(intl.t('nodeDriver.pinganyunecs.errors.accessKeyRequired'));
      }

      if (!accessSecret) {
        errors.push(intl.t('nodeDriver.pinganyunecs.errors.accessSecretRequired'));
      }

      if (errors.length > 0) {
        set(this, 'errors', errors);
        cb(false);

        return;
      }
      const promises = [this.loadRegions(), this.loadOsTypes()];

      all(promises).then(([regions, osTypes]) => {
        set(this, 'regions', regions);
        const regionChanged = this.setOptionsDefaultValue('config.region', 'regions');

        if (!regionChanged) {
          this.regionDidChange();
        }
        set(this, 'osTypes', osTypes);
        this.setOptionsDefaultValue('osTypeId', 'osTypes');
        set(this, 'step', 2);
        cb(true);
      }).catch((err) => {
        errors.push(err);
        set(this, 'errors', errors);
        cb(false);
      });
    },
    showStorageConfig(cb) {
      set(this, 'errors', null);
      const errors = get(this, 'errors') || [];
      const intl = get(this, 'intl');
      const regionId = get(this, 'config.region');
      const zoneId = get(this, 'config.zone');
      const podId = get(this, 'config.podId');
      const vpcId = get(this, 'config.vpcId');
      const networkId = get(this, 'config.networkId');
      const natId = get(this, 'config.natId');

      if (!regionId) {
        errors.push(intl.t('nodeDriver.pinganyunecs.errors.regionIdRequired'));
      }
      if (!zoneId) {
        errors.push(intl.t('nodeDriver.pinganyunecs.errors.zoneIdRequired'));
      }
      if (!podId) {
        errors.push(intl.t('nodeDriver.pinganyunecs.errors.podIdRequired'));
      }
      if (!vpcId) {
        errors.push(intl.t('nodeDriver.pinganyunecs.errors.vpcIdRequired'));
      }
      if (!networkId) {
        errors.push(intl.t('nodeDriver.pinganyunecs.errors.networkIdRequired'));
      }
      if (!natId) {
        errors.push(intl.t('nodeDriver.pinganyunecs.errors.natIdIdRequired'));
      }
      if ( errors.length > 0 ) {
        set(this, 'errors', errors);
        cb(false);

        return;
      }
      set(this, 'step', 3);
      cb();
    },
    showInstanceConfig(cb) {
      set(this, 'errors', null);

      const errors = get(this, 'errors') || [];
      const intl = get(this, 'intl');
      const diskSize = get(this, 'config.diskSize');
      const diskType = get(this, 'config.diskType');

      if (diskSize) {
        if (!diskType) {
          errors.push(intl.t('nodeDriver.pinganyunecs.errors.diskTypeRequired'));
        }
        if (!/^[0-9]+$/.test(diskSize) || parseInt(diskSize, 10) > 2000) {
          errors.push(intl.t('nodeDriver.pinganyunecs.errors.diskSizeExceedTheLimit'));
        }
      }

      if ( errors.length > 0 ) {
        set(this, 'errors', errors);
        cb(false);

        return;
      }
      set(this, 'step', 4);
      cb(true);
    },
  },
  regionDidChange: observer('config.region', function() {
    const regionId = get(this, 'config.region');

    if (!regionId) {
      set(this, 'zones', []);
      set(this, 'vpcs', []);
      set(this, 'pods', []);
      set(this, 'productSeries', []);
      set(this, 'instanceTypes', []);
      set(this, 'securityGroups', []);
      set(this, 'ebsTypes', []);
      set(this, 'networks', []);
      set(this, 'images', []);
      set(this, 'zoneAvailableIps', 0);
      set(this, 'productSeriesId', null);
      set(this, 'osTypeId', null);
      set(this, 'config.zone', null);
      set(this, 'config.vpcId', null);
      set(this, 'config.podId', null);
      set(this, 'config.instanceType', null);
      set(this, 'config.networkId', null);
      set(this, 'config.imageId', null);
      set(this, 'config.securityGroup', null);
      set(this, 'config.diskType', null);
      set(this, 'config.diskSize', null);
      set(this, 'config.natId', null);

      return;
    }
    this.loadVpcs(regionId).then((vpcs) => {
      set(this, 'vpcs', vpcs);
      const vpcChanged = this.setOptionsDefaultValue('config.vpcId', 'vpcs');

      if (!vpcChanged) {
        this.vpcDidChange();
      }
    });
    this.loadZones(regionId).then((zones) => {
      set(this, 'zones', zones);
      const zoneChanged = this.setOptionsDefaultValue('config.zone', 'zones');

      if (!zoneChanged) {
        this.zoneDidChange();
      }
    });
    this.loadNatGateways(regionId).then((nats) => {
      set(this, 'nats', nats);
      this.setOptionsDefaultValue('config.natId', 'nats');
    });
  }),
  vpcDidChange: observer('config.vpcId', function() {
    const vpcId = get(this, 'config.vpcId');

    if (!vpcId) {
      set(this, 'networks', []);
      set(this, 'securityGroups', []);
      set(this, 'config.networkId', null);
      set(this, 'config.securityGroup', null);

      return
    }
    this.loadNetworks(vpcId).then((networks) => {
      set(this, 'networks', networks);
      const networkChanged = this.setOptionsDefaultValue('config.networkId', 'networks');

      if (!networkChanged) {
        this.networkDidChange();
      }
    });
  }),
  zoneDidChange: observer('config.zone', function() {
    const zoneId = get(this, 'config.zone');

    if (!zoneId) {
      set(this, 'pods', []);
      set(this, 'config.podId', null);
      set(this, 'productSeries', []);
      set(this, 'productSeriesId', null);

      return
    }

    this.loadPods(zoneId).then((pods) => {
      set(this, 'pods', pods);
      this.setOptionsDefaultValue('config.podId', 'pods');
    });
    this.loadProductSeries(zoneId).then((ps) => {
      set(this, 'productSeries', ps);
      const psChanged = this.setOptionsDefaultValue('productSeriesId', 'productSeries');

      if (!psChanged) {
        this.productSeriesDidChange();
      }
    });
  }),
  productSeriesDidChange: observer('productSeriesId', function() {
    const productSeriesId = get(this, 'productSeriesId');

    if (!productSeriesId) {
      set(this, 'ebsTypes', []);
      set(this, 'instanceTypes', []);
      set(this, 'config.instanceType', null);

      return;
    }
    const regionId = get(this, 'config.region');
    const zoneId = get(this, 'config.zone');

    this.loadDiskConfig(productSeriesId, regionId, zoneId).then((ebsTypes) => {
      set(this, 'ebsTypes', ebsTypes);
      // set(this, 'config.diskType', ebsTypes && ebsTypes.length > 0 ? ebsTypes[0].value : null);
    });
    this.loadInstanceTypes(zoneId, productSeriesId).then((instanceTypes) => {
      set(this, 'instanceTypes', instanceTypes);
      this.setOptionsDefaultValue('config.instanceType', 'instanceTypes');
    });
  }),
  networkDidChange: observer('config.networkId', function() {
    const networkId = get(this, 'config.networkId');

    if (!networkId) {
      set(this, 'securityGroups', []);
      set(this, 'zoneAvailableIps', 0);

      return;
    }
    const regionId = get(this, 'config.region');
    const vpcId = get(this, 'config.vpcId');

    this.loadSecurityGroups(networkId, regionId, vpcId).then((securityGroups) => {
      set(this, 'securityGroups', securityGroups);
    });
  }),
  reloadImages: observer('useType', 'osTypeId', 'config.region', 'config.zone', function() {
    const osTypeId = get(this, 'osTypeId');
    const regionId = get(this, 'config.region');
    const zoneId = get(this, 'config.zone');
    const useType = get(this, 'useType');

    if (useType && osTypeId && regionId && zoneId) {
      this.loadImages(osTypeId, regionId, zoneId, useType).then((images) => {
        set(this, 'images', images);
        this.setOptionsDefaultValue('config.imageId', 'images');
      });
    } else {
      set(this, 'images', []);
      set(this, 'config.imageId', null);
    }
  }),
  reloadZoneAvailableIps: observer('config.networkId', 'config.zone', function() {
    const networkId = get(this, 'config.networkId');
    const zoneId = get(this, 'config.zone');

    if (zoneId && networkId) {
      this.loadZoneAvailableIps(networkId, zoneId).then((zaips) => {
        set(this, 'zoneAvailableIps', zaips);
      });
    } else {
      set(this, 'zoneAvailableIps', 0);
    }
  }),
  currentRegion: computed('regions', 'config.region', function() {
    const regions = get(this, 'regions') || [];
    const regionId = get(this, 'config.region');
    const found = regions.find((r) => r.value === regionId)

    if (found) {
      return found.label;
    }

    return '';
  }),
  currentZone: computed('zones', 'config.zone', function() {
    const zones = get(this, 'zones') || [];
    const zoneId = get(this, 'config.zone');
    const found = zones.find((z) => z.value === zoneId);

    if (found) {
      return found.label;
    }

    return '';
  }),
  currentPod: computed('pods', 'config.podId', function() {
    const pods = get(this, 'pods') || [];
    const podId = get(this, 'config.podId');
    const found = pods.find((p) => p.value === podId);

    if (found) {
      return found.label;
    }

    return '';
  }),
  currentVpc: computed('vpcs', 'config.vpcId', function() {
    const vpcs = get(this, 'vpcs') || [];
    const vpcId = get(this, 'config.vpcId');
    const found = vpcs.find((v) => v.value === vpcId);

    if (found) {
      return found.label;
    }

    return '';
  }),
  currentNetwork: computed('networks', 'config.networkId', function() {
    const networks = get(this, 'networks') || [];
    const networkId = get(this, 'config.networkId');
    const found = networks.find((n) => n.value === networkId);

    if (found) {
      return found.label;
    }

    return '';
  }),
  currentSecurityGroup: computed('securityGroups', 'config.securityGroup', function() {
    const securityGroups = get(this, 'securityGroups') || [];
    const securityGroupId = get(this, 'config.securityGroup');
    const found = securityGroups.find((s) => s.value === securityGroupId);

    if (found) {
      return found.label;
    }

    return '';
  }),
  currentDiskType: computed('ebsTypes', 'config.diskType', function() {
    const ebsTypes = get(this, 'ebsTypes') || [];
    const diskType = get(this, 'config.diskType');
    const found = ebsTypes.find((d) => d.value === diskType);

    if (found) {
      return found.label;
    }

    return '';
  }),
  currentNat: computed('nats', 'config.natId', function() {
    const nats = get(this, 'nats') || [];
    const natId = get(this, 'config.natId');
    const found = nats.find((n) => n.value === natId);

    if (found) {
      return found.label;
    }

    return '';
  }),
  loadZones(regionId) {
    return this.apiRequest('ListZones', {
      regionId,
      productCode: 'Instance'
    }).then((resp) => {
      const zones = resp.Zones.map((zone) => {
        return {
          value: zone.Id,
          label: zone.DisplayName,
        };
      });

      return zones;
    });
  },
  loadPods(zoneId) {
    return this.apiRequest('ListPods', {
      zoneId,
      productCode: 'Instance'
    }).then((resp) => {
      const pods = resp.Pods.map((pod) => {
        return {
          value: pod.Id,
          label: pod.DisplayName
        }
      });

      return pods;
    });
  },
  loadVpcs(regionId) {
    return this.apiRequest('SelectVpcItem', {
      regionId,
      status: 'Available'
    }).then((resp) => {
      const vpcs = resp.Selects.map((vpc) => {
        return {
          value: vpc.RealVal,
          label: `${ vpc.DisplayText }(${ vpc.DisplayName })`
        };
      });

      return vpcs;
    });
  },
  loadRegions() {
    return this.apiRequest('ListRegions', { productCode: 'Instance' }).then((resp) => {
      const regions = resp.Regions.map((region) => {
        return {
          value: region.Id,
          label: region.DisplayName
        }
      });

      return regions;
    });
  },
  loadSecurityGroups(networkId, regionId, vpcId) {
    return this.apiRequest('ListSecurityGroups', {
      networkId,
      regionId,
      vpcId
    }).then((resp) => {
      const sgs = resp.SecurityGroups.map((sg) => {
        return {
          value: sg.Id,
          label: sg.Name,
        };
      });

      return sgs;
    });
  },
  loadZoneAvailableIps(networkId, zoneId) {
    return this.apiRequest('ListZoneAvailableIPs', {
      networkId,
      zoneUuid: zoneId
    }).then((resp) => {
      return resp.AvailableIPNumber;
    });
  },
  loadNetworks(vpcId) {
    return this.apiRequest('SelectNetworkItem', {
      serviceProductType: 'ECS',
      status:             'Available',
      vpcId
    }).then((resp) => {
      const networks = resp.Selects.map((network) => {
        return {
          value: network.RealVal,
          label: `${ network.DisplayText }(${ network.DisplayName })`
        };
      });

      return networks;
    });
  },
  loadProductSeries(zoneId) {
    return this.apiRequest('ListProductSeries', {
      zoneId,
      productName: 'Instance'
    }).then((resp) => {
      const productSerices = resp.ProductSeries.filter((ps) => {
        return ps.ProductLabelStatus.indexOf('Normal') > -1
      }).map((ps) => {
        return {
          value: ps.Id,
          label: ps.DisplayName
        };
      });

      return productSerices;
    });
  },
  loadDiskConfig(instanceProductSeriesId, regionId, zoneId) {
    return this.apiRequest('ListEbsTypesByInstanceType', {
      instanceProductSeriesId,
      regionId,
      zoneId
    }).then((resp) => {
      const ebsTypes = resp.EbsTypes.map((ebsType) => {
        return {
          value: ebsType.Id,
          label: ebsType.DisplayName,
          raw:   ebsType
        };
      });

      return ebsTypes;
    });
  },
  loadInstanceTypes(zoneId, productSeriesId) {
    return this.apiRequest('ListInstanceTypes', {
      productSeriesId,
      zoneId
    }).then((resp) => {
      const instanceTypes = resp.InstanceTypes.map((it) => {
        return {
          value: it.Name,
          label: `${ it.Description }(${ it.CpuNumber } ${ it.CpuNumber > 1 ? 'Cores' : 'Core' } ${ it.Memory / 1024 } GB RAM)`
        };
      });

      return instanceTypes;
    });
  },
  loadOsTypes() {
    return this.apiRequest('ListOsTypes').then((resp) => {
      const osTypes = resp.OsTypes.map((osType) => {
        return {
          value:      osType.Id,
          label:      osType.Name,
          osCategory: osType.OsCategory
        };
      });

      return osTypes;
    });
  },
  loadImages(osTypeId, regionId, zoneId, useType) {
    return this.apiRequest('ListImages', {
      osTypeId,
      regionId,
      zoneId,
      useType,
    }).then((resp) => {
      const images = resp.Images.map((image) => {
        return {
          value: image.Id,
          label: image.Name,
          raw:   image,

        }
      });

      return images;
    });
  },
  loadNatGateways(regionId) {
    return this.apiRequest('ListNat',
      {
        regionId,
        status: ['Available']
      }).then((resp) => {
      const nats = resp.NatBeanList.map((nat) => {
        return {
          value: nat.Id,
          label: nat.Name,
          raw:   nat,

        }
      });

      return nats;
    });
  },
  setOptionsDefaultValue(valueKey, optionsKey) {
    const value = get(this, valueKey);
    let valueChanged = true;

    if (value) {
      let found = get(this, optionsKey).findBy('value', value)

      if (!found) {
        set(this, valueKey, get(this, `${ optionsKey }.firstObject.value`));
      } else {
        valueChanged = false;
      }
    } else {
      set(this, valueKey, get(this, `${ optionsKey }.firstObject.value`));
    }

    return valueChanged;
  },
  bootstrap() {
    const pw = this.genPw();
    let config = get(this, 'globalStore').createRecord({
      type:             'pinganyunecsConfig',
      accessKeyId:      '',
      accessKeySecret: '',
      displayName:      '',
      sshPassword:      pw,
    });

    set(this, 'model.pinganyunecsConfig', config);
  },
  apiErrorMessage(err, kind, prefix, def) {
    let answer = (err.xhr || {}).responseJSON || {};
    let text = (answer[kind] || {}).errortext;

    if (text) {
      return `${ prefix  }: ${  text }`;
    } else {
      return def;
    }
  },
  validate() {
    this._super();
    const errors = get(this, 'model').validationErrors();
    const intl = get(this, 'intl');
    const displayName = get(this, 'config.displayName');
    const name = get(this, 'model.name');

    if (!name) {
      errors.push('Name is required');
    }
    if (displayName && !/^[\u4e00-\u9fa5 a-zA-Z0-9@_\-]{0,5}$/.test(displayName)) {
      errors.push(intl.t('nodeDriver.pinganyunecs.errors.instanceNameNotValid'));
    }
    set(this, 'errors', errors);

    return errors.length === 0;
  },
  genPw() {
    const lower = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
    const upper = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    const number = ['0', '1', '2', '3', '4', '6', '7', '8', '9'];
    const special = ['!', '@', '#', '$', '%', '^', '&'];
    const all = lower.concat(upper).concat(number).concat(special);
    const randomFrom = (l, u) => {
      return Math.floor(Math.random() * (u - l + 1) + l);
    };
    const getOne = (arr) => {
      return arr[Math.floor(Math.random() * arr.length)];
    };

    const arr = [getOne(lower), getOne(upper), getOne(number), getOne(special)];

    const len = randomFrom(8, 16);

    for (let i = 4; i < len; i++) {
      arr.push(getOne(all));
    }

    const newArr = [];

    for (let j = 0;j < len;j++) {
      newArr.push(arr.splice(Math.random() * arr.length, 1)[0]);
    }

    return newArr.join('');
  },
  apiRequest(action, params = {}) {
    // let url = `${ get(this, 'app.proxyEndpoint')  }/https:/${  this.pinganyunApi }`;
    let url = `https://${  this.pinganyunApi }`;
    const date = new Date();
    const qs = {
      signatureMethod:  'HMAC-SHA1',
      signatureVersion: '1.0',
      version:          '2017-01-01',
      accessKeyId:      get(this, 'config.accessKeyId'),
      signatureNonce:   String(date.getTime()) + randomNumbers(4),
      timestamp:        date.getTime(),
      action,
    }

    Object.keys(params).forEach((k) => {
      qs[k] = params[k];
    });
    const querystring = Object.entries(qs).map((item) => ({
      name:  item[0],
      value: item[1]
    }))
      .sort((a, b) => {
        return a.name < b.name ? -1 : 1;
      }).map((item) => {
        if (item.value === undefined) {
          return encodeURIComponent(item.name);
        } else {
          return `${ encodeURIComponent(item.name) }=${ encodeURIComponent(item.value) }`;
        }
      })
      .join('&');
    const signature = encodeURIComponent(
      AWS.util.crypto.hmac(
        get(this, 'config.accessKeySecret'),
        querystring.toLowerCase(),
        'base64',
        'sha1'
      )
    );

    return get(this, 'globalStore').rawRequest({
      url:    `${ url }?${ querystring }&signature=${ signature }`,
      method: 'GET',
    }).then((xhr) => {
      const code = get(xhr, 'body.Code');
      const error = get(xhr, 'body.Message');

      if ( code !== 'Success' )  {
        set(this, 'errors', [error]);

        return reject();
      }

      return get(xhr, 'body') || JSON.parse(get(xhr, 'body'));
    }).catch((xhr) => {
      const error = get(xhr, 'body.Message') || JSON.stringify(xhr);

      set(this, 'errors', [error]);

      return reject();
    });
  }
});
