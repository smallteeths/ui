import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { computed, get } from '@ember/object';
import { formatSi, parseSi, exponentNeeded } from 'shared/utils/parse-unit';

export default Component.extend({
  intl: service(),

  nodes:     null,
  showTicks: false,

  cpuReservation: computed('nodes.@each.{allocatable,requested}', 'intl.locale', function() {
    return this.getGauge('cpu',
      (u, t) => formatSi(u, 1000, '', '', 0, exponentNeeded(t), 1).replace(/\s.*$/, ''),
      (t) => formatSi(t, 1000, '', '', 0, exponentNeeded(t), 1), 'reserved',
    );
  }),

  memoryReservation: computed('nodes.@each.{allocatable,requested}', 'intl.locale', function() {
    return this.getGauge('memory',
      (u, t) => formatSi(u, 1024, '', '', 0, exponentNeeded(t), 1).replace(/\s.*$/, ''),
      (t) => formatSi(t, 1024, 'iB', 'B', 0, exponentNeeded(t), 1), 'reserved',
    );
  }),

  podUsage: computed('nodes.@each.{allocatable,requested}', 'intl.locale', function() {
    return this.getGauge('pods',
      (u, t) => formatSi(u, 1000, '', '', 0, exponentNeeded(Math.max(u, t)), 1).replace(/\s.*$/, ''),
      (t, u) => formatSi(t, 1000, '', '', 0, exponentNeeded(Math.max(u, t)), 1), 'used',
    );
  }),

  getGauge(field, usedFormatCb, totalFormatCb, keyword) {
    const nodes = this.getNodes(field);
    const value = this.getValue(nodes)

    let usedCb = null
    let totalCb = null

    // pandaria
    switch (field) {
    case 'cpu':
      usedCb = (u) => `${ formatSi(u, 1000, '', '', 0, exponentNeeded(u), 1) * 1000 } milli CPU`
      totalCb = (t) => `${ formatSi(t, 1000, '', '', 0, exponentNeeded(t), 1) * 1000 } milli CPU`
      break;
    case 'memory':
      usedCb = (u) => formatSi(u, 1024, 'iB', 'B', 0, exponentNeeded(u), 1)
      totalCb = (t) => formatSi(t, 1024, 'iB', 'B', 0, exponentNeeded(t), 1)
      break;
    case 'pods':
      usedCb = (u) => `${ u }`
      totalCb = (t) => `${ t }`
      break;
    default:
      usedCb = (u) => formatSi(u, 1000, '', '', 0, exponentNeeded(u), 1)
      totalCb = (t) => formatSi(t, 1000, '', '', 0, exponentNeeded(t), 1)
    }

    return {
      percent:     value.percent,
      value:       value.current,
      subtitle:    this.getSubtitle(nodes, totalFormatCb, usedFormatCb, keyword),
      tooltipText: this.getTooltip(nodes, totalCb, usedCb, keyword),
      ticks:       get(this, 'showTicks') ? this.getTicks(nodes) : [],
    };
  },

  getTicks(nodes) {
    let filtered = [];

    if (nodes.length > 0) {
      const min = nodes[0].value;
      const max = nodes[nodes.length - 1].value;

      filtered = nodes.filter((node) => node.value === min || node.value === max);
    }
    const ticks = [];

    filtered.forEach((node) => {
      const found = ticks.find((tick) => tick.value === Math.round(node.value));

      if (found) {
        found.labels.push(node.node.nodeName || node.node.requestedHostname);
      } else {
        ticks.push({
          value:  Math.round(node.value),
          labels: [node.node.nodeName || node.node.requestedHostname],
        });
      }
    });

    return ticks;
  },

  getNodes(field) {
    return (this.get('nodes') || []).map((node) => {
      const tValue = node.allocatable && node.allocatable[field] ? node.allocatable[field] : '0';
      const uValue = node.requested && node.requested[field] ? node.requested[field] : '0';

      let total = parseSi(tValue);
      let used = parseSi(uValue);

      if (isNaN(total) || isNaN(used)) {
        used = 0;
        total = 0;
      }

      let value = 0;

      if (total > 0) {
        value = used * 100 / total;
      }

      return {
        node,
        used,
        total,
        value,
      };
    }).sortBy('value');
  },

  getValue(nodes) {
    let used = 0;
    let total = 0;

    nodes.forEach((node) => {
      total += node.total;
      used += node.used;
    });
    const value = Math.round(used * 100 / total);

    return {
      percent: isNaN(value) ? 0 : value,
      current:   used,
    }
  },

  getSubtitle(nodes, totalCb, usedCb, keyword) {
    let used = 0;
    let total = 0;

    nodes.forEach((node) => {
      total += node.total;
      used += node.used;
    });

    return this.get('intl').t(`clusterDashboard.subtitle.${ keyword }`, {
      used:  usedCb ? (usedCb(used, total) || '').trim() : used,
      total: totalCb ? (totalCb(total, used) || '').trim() : total,
    });
  },

  getTooltip(nodes, totalCb, usedCb, keyword) {
    let used = 0;
    let total = 0;

    nodes.forEach((node) => {
      used += node.used;
      total += node.total;
    });

    used = usedCb ? usedCb(used || '').trim() : used
    total = totalCb ? totalCb(total || '').trim() : total

    return this.get('intl').t(`clusterDashboard.subtitle.${ keyword }`, {
      used,
      total,
    });
  },
});
