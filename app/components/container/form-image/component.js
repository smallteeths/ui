import { scheduleOnce } from '@ember/runloop';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import layout from './template';
import { get, set, observer, computed } from '@ember/object'
import { debouncedObserver } from 'ui/utils/debounce';


// Remember the last value and use that for new one
var lastContainer = 'ubuntu:xenial';

export default Component.extend({
  scope:  service(),
  harbor: service(),

  layout,
  // Inputs
  initialValue: null,
  errors:       null,

  userInput:    null,
  tagName:      '',
  value:        null,
  allPods:      null,
  harborImages: [],
  harborServer: null,

  init() {
    this._super(...arguments);
    set(this, 'allPods', get(this, 'store').all('pod'));

    let initial = get(this, 'initialValue') || '';

    if ( !initial ) {
      initial = lastContainer;
    }

    scheduleOnce('afterRender', () => {
      this.send('setInput', initial);
      this.userInputDidChange();
      this.loadHarborServerUrl();
    });
  },

  actions: {
    setInput(str) {
      set(this, 'userInput', str);
    },
  },

  userInputDidChange: observer('userInput', function() {
    var input = (get(this, 'userInput') || '').trim();
    var out;

    if ( input && input.length ) {
      lastContainer = input;
      out = input;
    } else {
      out = null;
    }

    set(this, 'value', out);
    this.sendAction('changed', out);
    this.validate();
  }),
  searchImages: debouncedObserver('userInput', function() {
    var input = (get(this, 'userInput') || '').trim();

    this.loadImagesInHarbor(input);
  }),
  suggestions: computed('allPods.@each.containers', 'harborImages', function() {
    let inUse = [];

    get(this, 'allPods').forEach((pod) => {
      inUse.addObjects(pod.get('containers') || []);
    });

    inUse = inUse.map((obj) => (obj.get('image') || ''))
      .filter((str) => !str.includes('sha256:') && !str.startsWith('rancher/'))
      .uniq()
      .sort();

    return {
      'Used by other containers':             inUse,
      'Images in harbor image repositories': get(this, 'harborImages'),
    };
  }),

  validate() {
    var errors = [];

    if ( !get(this, 'value') ) {
      errors.push('Image is required');
    }

    set(this, 'errors', errors);
  },

  loadImagesInHarbor(query) {
    if (!get(this, 'harborServer')) {
      return;
    }
    if (!query) {
      set(this, 'harborImages', []);

      return;
    }

    return get(this, 'harbor').fetchProjectsAndImages(query).then((resp) => {
      const images = resp.body.repository.map((r) => {
        let url = get(this, 'harborServer');

        let endpoint = url.indexOf('://') > -1 ? url.substr(url.indexOf('://') + 3) : url;

        return `${ endpoint }/${ r.repository_name }`
      });

      set(this, 'harborImages', images);
    });
  },
  loadHarborServerUrl() {
    get(this, 'harbor').loadHarborServerUrl().then((resp) => {
      set(this, 'harborServer', resp);
    });
  }

});
