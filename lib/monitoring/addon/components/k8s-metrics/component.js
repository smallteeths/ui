import Component from '@ember/component';
import Metrics from 'shared/mixins/metrics';
import layout from './template';
import { get, set, observer } from '@ember/object';
import { formatSecond } from 'shared/utils/util';

export default Component.extend(Metrics, {
  layout,

  filters: { displayResourceType: 'kube-component' },

  singleStatsDidChange: observer('single.[]', function() {
    const responseSeconds = (get(this, 'single') || []).findBy('graph.title', 'ingresscontroller-upstream-response-seconds');

    if ( responseSeconds ) {
      set(this, 'responseSeconds', (get(responseSeconds, 'series') || [])
        .sortBy('series.firstObject.points.firstObject.firstObject').map((serie) => {
          return {
            host: get(serie, 'tags.host'),
            path: get(serie, 'tags.path'),
            time: formatSecond(get(serie, 'points.firstObject.firstObject'))
          }
        }));
    }
  })

});
