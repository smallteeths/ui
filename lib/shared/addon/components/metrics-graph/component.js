import Component from '@ember/component';
import layout from './template';
import { inject as service } from '@ember/service';
import { set, get, observer } from '@ember/object';

export default Component.extend({
  settings: service(),

  layout,

  rows:        null,
  graphs:      null,
  loading:     null,
  noGraphs:    null,
  noDataLabel: 'generic.noData',

  graphsDidChange: observer('graphs', function() {
    let out = [];
    const graphs = (get(this, 'graphs') || []);

    if ( get(this, 'rows.length') > 0 ) {
      let currentRow = -1;

      graphs.forEach((graph, index) => {
        if (index % 3 === 0) {
          currentRow++;
        }
        const row = get(this, 'rows').objectAt(currentRow);
        const item = row.objectAt(index % 3);

        set(item, 'series', get(graph, 'series'));
      });
    } else {
      graphs.forEach((graph, index) => {
        if (index % 3 === 0) {
          out.pushObject([graph]);
        } else {
          get(out, 'lastObject').pushObject(graph);
        }
      });
      set(this, 'rows', out);
    }
  }),
});
