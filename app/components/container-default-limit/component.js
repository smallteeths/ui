import {  get, set, observer, setProperties } from '@ember/object';
import Component from '@ember/component';
import { convertToMillis } from 'shared/utils/util';
import { parseSi } from 'shared/utils/parse-unit';
import layout from './template';

const RESOURCE_LIMIT_KEYS = {
  cpu: [
    'limitsCpu',
    'requestsCpu',
    'minCpu',
    'maxCpu',
  ],
  memory: [
    'limitsMemory',
    'requestsMemory',
    'minMemory',
    'maxMemory',
  ]
};

export default Component.extend({
  layout,

  limit: null,

  init() {
    this._super(...arguments);

    setProperties(this, RESOURCE_LIMIT_KEYS.cpu.reduce((t, k) => {
      t[k] = convertToMillis(get(this, `limit.${ k }`));

      return t;
    }, {}));

    RESOURCE_LIMIT_KEYS.memory.forEach((k) => {
      if (get(this, `limit.${ k }`)) {
        set(this, k, parseSi(get(this, `limit.${ k }`), 1024) / 1048576);
      }
    });
  },

  limitChanged: observer(...RESOURCE_LIMIT_KEYS.cpu, ...RESOURCE_LIMIT_KEYS.memory, function() {
    const out = {};

    RESOURCE_LIMIT_KEYS.cpu.forEach((k) => {
      if (get(this, k)) {
        set(out, k, `${ get(this, k) }m`);
      }
    });

    RESOURCE_LIMIT_KEYS.memory.forEach((k) => {
      if (get(this, k)) {
        set(out, k, `${ get(this, k) }Mi`);
      }
    });

    if (this.changed) {
      this.changed(out);
    }
  })
});
