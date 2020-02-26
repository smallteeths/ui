import Component from '@ember/component';
import layout from './template';
import { get, set, setProperties } from '@ember/object';
import { inject as service } from '@ember/service';
import { graphs } from 'global-admin/utils/cluster-metrics-graphs';
import moment from 'moment';
import { all as PromiseAll } from 'rsvp';

const getQueryString = (data, type) => {
  let arr = []

  data.map((node) => {
    if (node.metric[type]) {
      arr.push(node.metric[type])
    }
  })

  return arr.join('|')
}

export default Component.extend({
  globalStore: service(),
  settings:    service(),

  layout,

  graphs:        null,
  state:         null,
  timeOutAnchor: null,

  init() {
    this._super(...arguments);

    set(this, 'state', {
      loading:  false,
      noGraphs: false,
      start:    null,
      end:      null,
      step:     null,
      duration: null,
      interval: null,
    })
  },

  willDestroyElement() {
    this.clearTimeOut();
    this._super();
  },

  actions: {
    query(showLoading = true) {
      this.clearTimeOut();

      if (showLoading) {
        set(this, 'state.loading', true);
      }

      const url = `/k8s/clusters/${ this.settings.globalMonitoringClusterId }/api/v1/namespaces/cattle-global-data/services/http:access-dashboard:80/proxy/thanos-api/api/v1/`;

      const { duration, step } = this.state;
      const selectedRange = duration.match(/[a-zA-Z]+|[0-9]+(?:\.[0-9]+|)/g)
      const start = moment().subtract(selectedRange[0], selectedRange[1]).utc().format();
      const end = moment().utc().format();

      const queryRequests = [];

      graphs.forEach((graph) => {
        const query = graph.query(duration);

        queryRequests.push(this.globalStore.rawRequest({
          url:    `${ url }query?query=${ encodeURIComponent(query) }`,
          method: 'GET',
        }));
      });

      PromiseAll(queryRequests)
        .then((respones) => {
          if (this.isDestroyed || this.isDestroying) {
            return;
          }
          const queryRangeRequests = [];

          respones.forEach((res, index) => {
            const graph = graphs[index];
            const queryRange = graph.queryRange(getQueryString(get(res, 'body.data.result'), graph.target));

            queryRangeRequests.push(this.globalStore.rawRequest({
              url:    `${ url }query_range?query=${ encodeURIComponent(queryRange) }&start=${ start }&end=${ end }&step=${ step }`,
              method: 'GET',
            }));
          });

          PromiseAll(queryRangeRequests)
            .then((respones) => {
              if (this.isDestroyed || this.isDestroying) {
                return;
              }
              const out = [];

              respones.forEach((res, index) => {
                const graph = graphs[index]
                const data = get(res, 'body.data.result');

                out.push(
                  {
                    graph: {
                      unit:  graph.unit,
                      title: graph.title,
                    },
                    series: data.map((serie) => {
                      return {
                        name:   graph.tooltip(serie.metric),
                        points: serie.values.map((value) => [value[1], value[0] * 1000])
                      }
                    })
                  }
                );
              })

              this.updateData(out);
            })
            .finally(() => {
              if (this.isDestroyed || this.isDestroying) {
                return;
              }
              if (showLoading) {
                set(this, 'state.loading', false);
              }
            });
        })
        .catch(() => {
          if (this.isDestroyed || this.isDestroying) {
            return;
          }
          if (showLoading) {
            set(this, 'state.loading', false);
          }
        });
    }
  },

  updateData(out) {
    const graphs = [];

    out.forEach((item) => {
      if ((item.series || []).find((serie) => get(serie, 'points.length') > 1)) {
        graphs.push(item);
      }
    })

    setProperties(this, {
      'state.noGraphs': graphs.length === 0,
      graphs,
    });

    const timeOutAnchor = setTimeout(() => {
      this.send('query', false);
    }, this.state.interval * 1000);

    set(this, 'timeOutAnchor', timeOutAnchor);
  },

  clearTimeOut() {
    const timeOutAnchor = this.timeOutAnchor;

    if (timeOutAnchor) {
      clearTimeout(timeOutAnchor);
      set(this, 'timeOutAnchor', timeOutAnchor);
    }
  },
});
