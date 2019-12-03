import Controller from '@ember/controller';
import {
  setProperties, get, set, computed, observer
} from '@ember/object';
import { inject as service } from '@ember/service';

export default Controller.extend({
  intl:                   service(),
  queryParams:            ['page', 'keyName', 'keyValue'],
  page:                   1,
  searchText:             '',
  selectValue:            'username',
  headers:                [
    {
      name:           'username',
      translationKey: 'harborConfig.table.username',
      width:          100,
      sort:            true,
    },
    {
      name:            'repo_name',
      translationKey: 'harborConfig.table.imagename',
      sort:            true,
    },
    {
      name:           'repo_tag',
      translationKey: 'harborConfig.table.tag',
      sort:            true,
    },
    {
      name:           'operation',
      translationKey: 'harborConfig.table.operation',
      sort:            true,
    },
    {
      name:           'op_time',
      translationKey: 'harborConfig.table.timestamp',
      sort:            true,
      width:          175,
    },
  ],
  availableActions: [
    {
      action:   'remove',
      icon:     'icon icon-trash',
      label:    'action.remove',
    },
  ],
  actions:     {
    pageChange(page) {
      this.transitionToRoute({ queryParams: { page } });
    },
    search(val) {
      let key = get(this, 'selectValue');
      let object = {
        page:     1,
        keyName:  key,
        keyValue: val
      }

      setProperties(this, object);
    },
    clearSearch(){
      set(this, 'keyValue', '');
    },
    sortChanged(val) {
      const d = [...get(this, 'model.data')];
      let compare = function(obj1, obj2) {
        let a = obj1[val.sortBy];
        let b = obj2[val.sortBy];

        if ( a < b ) {
          return val.descending ? 1 : -1;
        } else if (a > b) {
          return val.descending ? -1 : 1;
        } else {
          return 0;
        }
      }

      set(this, 'model.data', d.sort(compare));
    }
  },
  keyValueChanged: observer('keyValue', function() {
    set(this, 'searchText', get(this, 'keyValue'));
  }),
  selectData: computed('intl.locale', function() {
    const intl = get(this, 'intl');
    let arr = [{
      Label:          intl.t('harborConfig.form.search.username'),
      value:          'username'
    },
    {
      Label:          intl.t('harborConfig.form.search.store'),
      value:          'repository'
    },
    {
      Label:          intl.t('harborConfig.form.search.tag'),
      value:          'tag'
    },
    {
      Label:          intl.t('harborConfig.form.search.operation'),
      value:          'operation'
    }];

    return arr;
  }),
  hasHarborServer: computed('model.harborServer', function() {
    return !!get(this, 'model.harborServer');
  } ),
  data: computed( 'model.data', function() {
    const rawData = get(this, 'model.data');

    return rawData;
  }),
});
