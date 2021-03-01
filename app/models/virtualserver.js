import { get, set, computed } from '@ember/object';
import Resource from '@rancher/ember-api-store/models/resource';
import { reference } from '@rancher/ember-api-store/utils/denormalize';
import { inject as service } from '@ember/service';

const TARGET = 'f5.pandaria.io/targets';

export default Resource.extend({
  clusterStore:  service(),
  router:        service(),

  type: 'virtualserver',

  namespace: reference('namespaceId', 'namespace', 'clusterStore'),

  targets: computed('pools', function(){
    const a = get(this, 'annotations') || {};
    const pools = get(this, 'pools');
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
    let errors = [];
    const pools = get(this, 'pools') || [];
    const virtualServerAddress = get(this, 'virtualServerAddress');
    const virtualServerHTTPPort = get(this, 'virtualServerHTTPPort');
    const virtualServerHTTPSPort = get(this, 'virtualServerHTTPSPort');
    const host = get(this, 'host');

    if (!virtualServerAddress) {
      errors.push(intl.t('validation.required', { key: intl.t('f5CtlPage.form.url.label') }));
    }

    if (!virtualServerHTTPPort) {
      errors.push(intl.t('validation.required', { key: intl.t('f5CtlPage.form.http.label') }));
    }

    if (!virtualServerHTTPSPort) {
      errors.push(intl.t('validation.required', { key: intl.t('f5CtlPage.form.https.label') }));
    }

    if (!host) {
      errors.push(intl.t('validation.required', { key: intl.t('f5CtlPage.form.domain.label') }));
    }

    if (pools.length === 0) {
      errors.push(intl.t('validation.required', { key: intl.t('formIngress.label') }));
    }

    pools.forEach((pool, index) => {
      if (pool.monitor) {
        if (!get(pool, 'monitor.interval')) {
          errors.push(intl.t('f5CtlPage.validation.pool', {
            index,
            key: intl.t('f5CtlPage.form.interval.label')
          }));
        }
        if (!get(pool, 'monitor.send')) {
          errors.push(intl.t('f5CtlPage.validation.pool', {
            index,
            key: intl.t('f5CtlPage.form.send.label')
          }));
        }
      }

      if (!pool.service) {
        errors.push(intl.t('f5CtlPage.validation.pool', {
          index,
          key: intl.t('formIngressBackends.target')
        }));
      }

      if (!pool.servicePort) {
        errors.push(intl.t('f5CtlPage.validation.pool', {
          index,
          key: intl.t('f5CtlPage.form.port.label')
        }));
      }
    });

    return errors;
  },

  actions:      {
    edit() {
      get(this, 'router').transitionTo('authenticated.project.f5.controllers.detail.edit', get(this, 'id'), { queryParams: { type: get(this, 'type') } });
    },
  },

});
