import Component from '@ember/component';
import { observer, setProperties } from '@ember/object';
import layout from './template';
import { next } from '@ember/runloop';

const PERIODS = [
  {
    label:    'metricsAction.periods.5m',
    value:    '5m',
    step:     '10s',
    interval: 30,
  },
  {
    label:    'metricsAction.periods.1h',
    value:    '1h',
    step:     '60s',
    interval: 60,
  },
  {
    label:    'metricsAction.periods.6h',
    value:    '6h',
    step:     '60s',
    interval: 60,
  },
  {
    label:    'metricsAction.periods.24h',
    value:    '24h',
    step:     '5m',
    interval: 60,
  },
  {
    label:    'metricsAction.periods.7d',
    value:    '7d',
    step:     '30m',
    interval: 60,
  },
];

export default Component.extend({
  layout,
  classNames: 'mb-20',
  periods:    PERIODS,

  init() {
    this._super(...arguments);

    next(() => {
      this.query();
    });
  },

  actions: {
    refresh() {
      this.query();
    }
  },

  periodDidChange: observer('selected', function() {
    this.query();
  }),

  selected: PERIODS[0].value,

  query() {
    const params = PERIODS.findBy('value', this.selected);

    setProperties(this.state, {
      duration: params.value,
      step:     params.step,
      interval: params.interval,
    });
    this.queryAction();
  },

  queryAction() {
    throw new Error('queryAction action is required!');
  },
});
