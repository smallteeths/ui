import Component from '@ember/component';
import layout from './template';
import { inject as service } from '@ember/service';
import { get, computed } from '@ember/object';

const FEATURE_HEADERS = [
  {
    translationKey: 'featureFlags.table.state',
    name:           'state',
    sort:           ['state'],
    width:          '100px',
  },
  {
    translationKey: 'featureFlags.table.restart',
    name:           'restart',
    sort:           ['status.dynamic'],
    width:          '90px',
  },
  {
    translationKey: 'featureFlags.table.name',
    name:           'name',
    sort:           ['name'],
    searchField:    'name',
    width:          '300px',
  },
  {
    translationKey: 'featureFlags.table.description',
    name:           'description',
    sort:           ['description'],
    searchField:    'description',
  },
];

const TEMP_FEATURE_DESCRIPTIONS = [
  {
    feature:                   'istio-virtual-service-ui',
    descriptionTranslationKey: 'featureFlags.features.istioVirtualServiceUi'
  },
  {
    feature:                   'unsupported-storage-drivers',
    descriptionTranslationKey: 'featureFlags.features.unsupportedStorageDrivers'
  },
  {
    feature:                   'fleet',
    descriptionTranslationKey: 'featureFlags.features.fleet'
  },
  {
    feature:                   'project-pipeline-service-ui',
    descriptionTranslationKey: 'featureFlags.features.projectPipelineServiceUI'
  },
  {
    feature:                   'virtaitech-gpu-service-ui',
    descriptionTranslationKey: 'featureFlags.features.virtaitechGpuServiceUI'
  }
]

export default Component.extend({
  intl:     service(),
  settings: service(),

  layout,

  bulkActions:         false,
  descending:          false,
  featuresHeaders:     FEATURE_HEADERS,
  model:               null,
  searchText:          '',
  sortBy:              'name',
  stickyHeader:        false,

  filteredFeatures: computed('model.[]', function() {
    return get(this, 'model').filter((feature) => feature.name !== 'dashboard');
  }),
  featureDescMap: computed('filteredFeatures.[]', 'intl.locale', function() {
    return this.filteredFeatures.reduce((t, c) => {
      const fd = TEMP_FEATURE_DESCRIPTIONS.find((d) => d.feature === c.name)

      if (fd) {
        t[c.name] = this.intl.t(fd.descriptionTranslationKey)
      } else {
        t[c.name] = c.status.description
      }

      return t
    }, {})
  })
});
