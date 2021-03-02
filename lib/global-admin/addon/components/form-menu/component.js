import Component from '@ember/component';
import { observer, set, computed, get } from '@ember/object'
import layout from './template';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';

const SCHEME = 'https://';

export default Component.extend({
  globalStore:      service(),
  scope:            service(),
  intl:             service(),

  layout,

  tolerate:        null,
  editing:         true,
  title:           null,
  tolerationArray: null,
  scheme:          SCHEME,
  urlInvalid:      false,

  pageScope:   alias('scope.currentPageScope'),

  init() {
    this._super(...arguments);
    this.initArray();
  },

  actions: {
    addItem() {
      this.get('array').pushObject({
        label:         '',
        url:           '',
        iframeEnabled: false,
      });
      set(this, 'iframeEnabledChanged', false)
    },

    removeItem(item) {
      this.get('array').removeObject(item);
    },
  },

  inputChanged: observer('array.@each.{label,url}', function() {
    this.set('arrays', (this.get('array') || []).filter((a) => a.label && a.url));
  }),

  onIframeEnabledChanged: observer('array.@each.{iframeEnabled}', function() {
    set(this, 'iframeEnabledChanged', true);
  }),

  scopeContent: computed('globalStore', function() {
    const menuScope = get(this, 'menuScope')

    if (menuScope === 'cluster') {
      const clusters = get(this, 'globalStore').all('cluster') || []

      return [{
        label: get(this, 'intl').t('generic.all'),
        value: '',
      }, ...clusters.map((c) => {
        return {
          label: c.displayName,
          value: c.id,
        }
      })]
    } else if (menuScope === 'project') {
      const projects = get(this, 'globalStore').all('project') || []

      return [{
        label: get(this, 'intl').t('generic.all'),
        value: '',
      }, ...projects.map((p) => {
        return {
          label: p.displayName,
          value: p.id,
          group: get(p, 'cluster.displayName'),
        }
      })]
    }
  }),

  canSelectScope: computed('menuScope', function() {
    return get(this, 'menuScope') === 'cluster' || get(this, 'menuScope') === 'project'
  }),

  initArray() {
    const arrays = this.get('arrays') || [];

    this.set('array', arrays);
  },

})