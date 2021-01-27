import { get, set, observer, setProperties } from '@ember/object'
import Component from '@ember/component';
import { randomStr } from 'shared/utils/util';
import layout from './template';
import { inject as service } from '@ember/service';

const TARGET = 'f5.cattle.io/targets';

export default Component.extend({
  intl: service(),

  layout,
  f5:      null,
  pool:    null,
  temp:    {},
  editing: null,

  pathArray: null,

  init() {
    this._super(...arguments);
    this.iniTemp();
  },

  didInsertElement() {
    // if (get(this, 'editing') && get(this, 'pathArray.length') === 0) {
    //   this.send('addPath', 'workload');
    // }
  },

  tempChanged: observer('temp.{path,serviceId,servicePort,backendType}', function() {
    this.setPool();
  }),

  servicesDidChange: observer('temp.service', function() {
    const temp = get(this, 'temp');
    const servicePort = get(temp, 'servicePort');
    const availablePorts = get(temp, 'service.availablePorts') || [];
    const hasPorts = get(temp, 'service.availablePorts.length') > 0;

    if (get(temp, 'backendType') === 'service' && hasPorts && !availablePorts.find((p) => p.port === servicePort)) {
      set(temp, 'servicePort', get(temp, 'service.availablePorts.firstObject.port'));
    }
  }),

  // hasServiceTargets: computed('pathArray.@each.backendType}', function() {
  //   return !!get(this, 'pathArray').findBy('backendType', 'service');
  // }),

  iniTemp() {
    const pool = get(this, 'pool');
    const backendType = (get(pool, 'service') && get(pool, 'service').includes('f5-service-')) ? 'workload' : 'service';
    const servicePort = get(pool, 'servicePort');
    const serviceId = get(pool, 'service');
    const temp = get(this, 'store').createRecord({
      type:        'pool',
      servicePort,
      serviceId:   backendType === 'workload' ? this.getWorkloadId(serviceId, servicePort) : serviceId,
      path:        get(pool, 'path'),
      backendType,
      serviceCopy: backendType === 'workload' ? `${ get(pool, 'service') }/${ get(pool, 'servicePort') }` : null
    });

    set(this, 'temp', temp);
  },

  setPool() {
    const path = get(this, 'temp.path');
    const service = this.serviceHandler();
    const servicePort = get(this, 'temp.servicePort');

    setProperties(get(this, 'pool'), {
      path,
      service,
      servicePort,
    })
  },

  serviceHandler() {
    const backendType = get(this, 'temp.backendType');
    const servicePort = get(this, 'temp.servicePort');
    let serviceId = get(this, 'temp.serviceId');
    const anno = get(this, 'f5.annotations') || {};
    let workloads = anno[TARGET] ? JSON.parse(anno[TARGET]) : {};
    const copy = get(this, 'temp.serviceCopy');

    if (copy) {
      delete workloads[copy];

      if (Object.keys(workloads).length === 0) {
        delete anno[TARGET]
      } else {
        anno[TARGET] = JSON.stringify(workloads);
      }

      set(this, 'f5.annotations', anno);
      set(this, 'temp.serviceCopy', null);
    }

    if (serviceId && backendType === 'service') {
      serviceId = serviceId.split(':')[1]
    }

    if (backendType === 'workload') {
      const serviceName = `f5-service-${ randomStr(16, 16, 'workload') }`;
      const key = `${ serviceName }/${ servicePort }`

      workloads[key] = serviceId

      anno[TARGET] = JSON.stringify(workloads);
      set(this, 'f5.annotations', anno);
      set(this, 'temp.serviceCopy', key);

      serviceId = serviceName;
    }

    return serviceId;
  },

  getWorkloadId(name, port) {
    const anno = get(this, 'f5.annotations') || {};
    let workloads = anno[TARGET] ? JSON.parse(anno[TARGET]) : {};

    return workloads[`${ name }/${ port }`]
  }
});
