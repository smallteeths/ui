import { scheduleOnce } from '@ember/runloop';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import layout from './template';
import { get, set, observer, computed } from '@ember/object';
import { debouncedObserver } from 'ui/utils/debounce';

const LINUX_LAST_CONTAINER = 'ubuntu:xenial'
const WINDOWS_LAST_CONTAINER = 'mcr.microsoft.com/dotnet/core/samples:aspnetapp'
// Remember the last value and use that for new one
var lastContainer;

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
  harborImages: {
    raw:  [],
    urls: [],
  },
  harborServer:        null,
  harborImageTags: [],
  imageTag:        null,
  latestQuery:     null,

  init() {
    this._super(...arguments);
    set(this, 'allPods', get(this, 'store').all('pod'));

    let initial = get(this, 'initialValue') || '';

    if ( !lastContainer ) {
      lastContainer = (get(this, 'scope.currentCluster.isWindows') ? WINDOWS_LAST_CONTAINER : LINUX_LAST_CONTAINER)
    }
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

    if (this.changed) {
      this.changed(out);
    }

    this.validate();
  }),

  imageTagDidChanged: observer('imageTag', function() {
    const tag = get(this, 'imageTag');

    if (tag) {
      const input = get(this, 'userInput');
      const harborRepo = get(this, 'harborRepo');
      let repo = input;

      if (repo.startsWith(`${ harborRepo }/`)) {
        repo = repo.replace(`${ harborRepo }/`, '')
      }
      const index = repo.indexOf(':');

      if ( index > -1) {
        set(this, 'userInput', `${ input.substr(0, input.lastIndexOf(':')) }:${ tag }`)
      } else {
        set(this, 'userInput', `${ input }:${ tag }`)
      }
    }
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
      'Used by other containers':            inUse,
      'Images in harbor image repositories': get(this, 'harborImages').urls
    };
  }),

  harborRepo: computed('harborServer', function() {
    const serverUrl = get(this, 'harborServer');

    if (!serverUrl) {
      return null;
    }
    const repo = serverUrl.indexOf('://') > -1 ? serverUrl.substr(serverUrl.indexOf('://') + 3) : serverUrl;

    return repo.replace(/\/+$/, '');
  }),
  captureVersion(str){
    let reg = /[0-9]+(\.[0-9]+)+/;
    const versionMat = str.match(reg);

    if (!versionMat) {
      return versionMat;
    }
    const [version] = versionMat;

    return [version, str];
  },
  captureMark(str){
    let nReg = /(.*)[_|-]([0-9]+)$/;
    const markMat = str.match(nReg);

    if (!markMat){
      return  markMat
    }
    const [, prefix, mark] = markMat;

    return [mark, str, prefix];
  },
  markSort(data2, data1){
    let mark1 = this.captureMark(data1);
    let mark2 = this.captureMark(data2);

    if (!mark1 || !mark2 || mark2[2] !== mark1[2]){
      return 0;
    }
    if (parseInt(mark1[0], 10) > parseInt(mark2[0], 10)){
      return 1;
    } else if (parseInt(mark1[0], 10) < parseInt(mark2[0], 10)){
      return -1;
    } else {
      return 0;
    }
  },
  versionSort(ver2, ver1) {
    if (ver1[0] === ver2[0]){
      return this.normalSort(ver2[1], ver1[1]);
    }
    const arr1 = ver1[0].split('.'),
      arr2 = ver2[0].split('.'),
      minLen = Math.min(arr1.length, arr2.length)

    for (let i = 0; i < minLen; i++) {
      if (parseInt(arr1[i], 10) > parseInt(arr2[i], 10)) {
        return 1;
      } else if (parseInt(arr1[i], 10) < parseInt(arr2[i], 10)) {
        return -1;
      }
      if (i + 1 === minLen) {
        if (arr1.length > arr2.length) {
          return 1;
        } else if (arr1.length < arr2.length){
          return -1;
        }
      }
    }
  },
  normalSort(str2, str1){
    return str2.localeCompare(str1);
  },
  tagsSortingInit(arrTag){
    let versions = [];
    let result = [];
    let noVersion = []

    arrTag.forEach((item) => {
      let version = this.captureVersion(item);

      if (version){
        versions.push(version);
      } else {
        noVersion.push(item);
      }
    });
    versions.sort(this.versionSort.bind(this)).forEach((item) => {
      result.push(item[1])
    });
    result = result.concat(noVersion.sort(this.normalSort.bind(this)));
    result = result.sort(this.markSort.bind(this))

    return result;
  },
  tagsResultFormat(arr){
    let list = [];

    arr.forEach((item) => {
      list.push({ name: item })
    });

    return list;
  },
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
    let input = query;

    if (!input) {
      set(this, 'harborImages', {
        raw:  [],
        urls: [],
      });
      set(this, 'harborImageTags', []);
      set(this, 'imageTag', null);

      return;
    }
    const harborRepo = get(this, 'harborRepo');

    if (input.startsWith(`${ harborRepo }/`)) {
      input = input.replace(`${ harborRepo }/`, '')
    }
    input = input.indexOf(':') > -1 ? input.substr(0, input.indexOf(':')) : input;
    if (get(this, 'latestQuery') === input) {
      return;
    }
    set(this, 'latestQuery', input);

    return get(this, 'harbor').fetchProjectsAndImages(input).then((resp) => {
      const repos = resp.body.repository;
      const repo = get(this, 'harborRepo');
      const urls = repos.map((r) => {
        return `${ repo }/${ r.repository_name }`;
      });

      set(this, 'harborImages', {
        raw:  repos,
        urls,
      });
      this.loadHarborImageVersions();
    });
  },

  loadHarborServerUrl() {
    get(this, 'harbor').loadHarborServerUrl().then((resp) => {
      set(this, 'harborServer', resp);
    });
  },

  loadHarborImageVersions() {
    const input = get(this, 'userInput');
    const harborRepo = get(this, 'harborRepo');

    if (!input.startsWith(harborRepo)) {
      set(this, 'harborImageTags', []);

      return;
    }
    const image = input.replace(`${ harborRepo }/`, '').indexOf(':') > -1 ? input.substr(0, input.lastIndexOf(':')) : input;
    const repo = get(this, 'harborImages').raw.find((item) => {
      return image === `${ harborRepo }/${ item.repository_name }`;
    });

    if (!repo) {
      set(this, 'harborImageTags', []);

      return;
    }
    get(this, 'harbor').fetchTags(repo.project_id, repo.repository_name).then((resp) => {
      let names = [];
      let tags = [];

      try {
        Array.from(resp.body).forEach(({ name }) => {
          names.push(name);
        });
        tags = this.tagsResultFormat(this.tagsSortingInit(names));
      } catch (err) {
        console.log(err)
        tags = resp.body;
      }
      const input = get(this, 'userInput');
      const imageTag = input.indexOf(':') > -1 ? input.substr(input.indexOf(':') + 1) : null;
      const tag = tags.find((t) => t.name === imageTag);

      set(this, 'imageTag', tag && tag.name);
      set(this, 'harborImageTags', tags);
    });
  },
});
