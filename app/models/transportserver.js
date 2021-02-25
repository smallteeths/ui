import { get, set, computed } from '@ember/object';
import Resource from '@rancher/ember-api-store/models/resource';
import { reference } from '@rancher/ember-api-store/utils/denormalize';
import { inject as service } from '@ember/service';
import { isEmptyObject } from 'shared/utils/flat-map';

const TARGET = 'f5.cattle.io/targets';

export default Resource.extend({
  clusterStore:  service(),
  router:        service(),
  intl:          service(),

  type: 'transportserver',

  namespace: reference('namespaceId', 'namespace', 'clusterStore'),

  pools: computed('pool', function() {
    if (!get(this, 'pool')) {
      return []
    } else {
      return [get(this, 'pool')];
    }
  }),

  targets: computed('pools.@each.service', function(){
    const a = get(this, 'annotations') || {};
    const pools = get(this, 'pools') || [];
    const out = [];

    pools.forEach((pool) => {
      const w = getWorkload(a, pool)
      const neu = {
        ...pool,
        isWorkload: !!w
      }

      if (!!w) {
        set(neu, 'workloadId', w.id)
        set(neu, 'workloadName', w.name)
      }

      out.push(neu)
    })

    function getWorkload(a, pool) {
      if (!a[TARGET]) {
        return null;
      }

      const target = JSON.parse(a[TARGET]);
      const id = target[`${ pool.service }/${ pool.servicePort }`];

      if (!id) {
        return null;
      }

      return {
        id,
        name: id.split(':')[2]
      }
    }

    return out;
  }),

  validationErrors() {
    const intl = get(this, 'intl');
    let errors = this._super(...arguments);
    const pool = get(this, 'pool') || {};
    const virtualServerAddress = get(this, 'virtualServerAddress');
    const virtualServerPort = get(this, 'virtualServerPort');

    if (!virtualServerAddress) {
      errors.push(intl.t('validation.required', { key: intl.t('f5CtlPage.form.url') }));
    }

    if (!virtualServerPort) {
      errors.push(intl.t('validation.required', { key: intl.t('f5CtlPage.form.port') }));
    }

    if (isEmptyObject(pool)) {
      errors.push(intl.t('validation.required', { key: intl.t('formIngress.label') }));
    }

    if (pool.monitor) {
      if (!get(pool, 'monitor.interval')) {
        errors.push(intl.t('f5CtlPage.validation.pool', {
          index: 0,
          key:   intl.t('f5CtlPage.form.interval')
        }));
      }
    }

    if (!pool.service) {
      errors.push(intl.t('f5CtlPage.validation.pool', {
        index: 0,
        key:   intl.t('formIngressBackends.target')
      }));
    }

    if (!pool.servicePort) {
      errors.push(intl.t('f5CtlPage.validation.pool', {
        index: 0,
        key:   intl.t('f5CtlPage.form.port')
      }));
    }

    return errors;
  },

  actions:      {
    edit() {
      get(this, 'router').transitionTo('authenticated.project.f5.controllers.detail.edit', get(this, 'id'), { queryParams: { type: get(this, 'type') } });
    },
  },

});
