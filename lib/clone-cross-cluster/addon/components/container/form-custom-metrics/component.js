import { inject as service } from '@ember/service';
import { get, set, observer } from '@ember/object';
import Component from '@ember/component';
import layout from './template';

const HTTPS = 'HTTPS';
const HTTP = 'HTTP'

const OPTIONS = [
  {
    label: HTTP,
    value: HTTP
  },
  {
    label: HTTPS,
    value: HTTPS
  }
];

export default Component.extend({
  scope: service(),

  layout,

  editing: false,

  protocolOptions: OPTIONS,

  init() {
    this._super(...arguments);

    set(this, 'metrics', get(this, 'workload.workloadMetrics') || []);
  },

  actions: {
    add() {
      get(this, 'metrics').pushObject({
        path:                        '',
        port:                        '',
        schema:                      HTTP,
        workloadMetricRelabelConfig: [],
      });
    },

    addLabel(metric) {
      if (!get(metric, 'workloadMetricRelabelConfig')) {
        set(metric, 'workloadMetricRelabelConfig', [
          {
            action:  'labeldrop',
            regex:   '',

            relabelType: 'metricRelabel',
          }
        ]);
      } else {
        get(metric, 'workloadMetricRelabelConfig').pushObject({
          action:  'labeldrop',
          regex:   '',

          relabelType: 'metricRelabel',
        })
      }
    },

    remove(obj) {
      get(this, 'metrics').removeObject(obj);
    },

    removeLabel(metric, label) {
      metric.workloadMetricRelabelConfig.removeObject(label);
    },

    regexChange() {
      this.metricsChanged();
    },
  },

  metricsChanged: observer('metrics.@each.{port,path,schema,workloadMetricRelabelConfig}', function() {
    let metrics = get(this, 'metrics').map((item) => {
      let obj = {};

      Object.assign(obj, item)
      if (obj.workloadMetricRelabelConfig && obj.workloadMetricRelabelConfig.length > 0) {
        obj.workloadMetricRelabelConfig = obj.workloadMetricRelabelConfig.filter((ele) => ele.regex)
        obj.workloadMetricRelabelConfig.length === 0 && delete obj.workloadMetricRelabelConfig;
      }

      return obj;
    })

    set(this, 'workload.workloadMetrics', metrics.filter((metric) => get(metric, 'port')));
  })
});
