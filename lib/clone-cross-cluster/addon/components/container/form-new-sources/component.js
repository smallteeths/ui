import { inject as service } from '@ember/service';
import Component from '@ember/component';
import layout from './template';
import { get, set } from '@ember/object';

export default Component.extend({
  intl:         service(),

  layout,
  sources:     null,
  statusClass: null,
  headers:     [
    {
      name:           'source',
      sort:           ['source'],
      translationKey: 'formSources.type.label',
      searchField:    'source',
    },
    {
      name:           'sourceName',
      sort:           ['sourceName', 'source'],
      searchField:    'sourceName',
      translationKey: 'formSources.source.label',
    },
    {
      name:           'sourceKey',
      sort:           ['sourceKey', 'sourceName', 'source'],
      searchField:    'sourceKey',
      translationKey: 'formSources.prefixOrKey.label',
    },
    {
      name:           'targetKey',
      sort:           ['targetKey', 'sourceKey', 'sourceName', 'source'],
      searchField:    'targetKey',
      translationKey: 'formSources.prefix.label',
    }
  ],

  init() {
    this._super(...arguments);
    if (!get(this, 'sources') ) {
      set(this, 'sources', [])
    }

    get(this, 'sources').forEach((source) => {
      if ( source.data.sourceKey === undefined ) {
        set(source.data, 'sourceKey', null);
      }
    });
  },
  actions: {
    removeSource(source) {
      get(this, 'sources').removeObject(source);
    },
  },
});
