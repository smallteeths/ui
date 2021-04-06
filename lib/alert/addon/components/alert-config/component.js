import Component from '@ember/component';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { reads, alias } from '@ember/object/computed'

const DEFAULT_CONFIG = `global:
  resolve_timeout: 5m
  smtp_require_tls: false
  slack_api_url: https://api.slack.com
  pagerduty_url: https://events.pagerduty.com/v2/enqueue`

export default Component.extend({
  globalStore: service(),
  scope:       service(),
  growl:       service(),
  router:      service(),

  pastedAnswers:  DEFAULT_CONFIG,
  pageScope:      reads('scope.currentPageScope'),
  currentCluster: alias('scope.currentCluster'),

  init() {
    this._super(...arguments);
    const annotations = get(this, 'currentCluster.annotations') || {}
    const alertConfig = annotations['field.cattle.io/alertConfig']

    if (alertConfig) {
      set(this, 'pastedAnswers', alertConfig)
    }
  },

  actions: {
    save(cb) {
      const alertConfig = get(this, 'pastedAnswers')

      const cluster = get(this, 'currentCluster')

      set(cluster, 'annotations', {
        ...get(cluster, 'annotaions'),
        'field.cattle.io/alertConfig': alertConfig,
      })

      cluster.save().then(() => {
        this.send('cancel');
      }).catch((err) => {
        this.growl.fromError(err);
        if (cb) {
          cb(false);
        }
      })
    },

    cancel() {
      get(this, 'router').transitionTo('authenticated.cluster.alert.index');
    },

    resetConfig() {
      set(this, 'pastedAnswers', DEFAULT_CONFIG)
    },
  },

});
