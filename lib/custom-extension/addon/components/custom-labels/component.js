import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { get, set, observer, computed } from '@ember/object';

export default Component.extend({
  harbor:                 service(),
  prefs:                  service(),
  showAddLabelModal:      false,
  showEditLabelModal:     false,
  showConfirmDeleteModal: false,
  labelParam:             {},
  rawData:                [],
  totalCount:             0,
  page:                   1,
  selectedLabels:         [],
  editingLabel:           {},
  labelColors:            [
    {
      'color':     '#000000',
      'textColor': 'white'
    }, {
      'color':     '#61717D',
      'textColor': 'white'
    },
    {
      'color':     '#737373',
      'textColor': 'white'
    }, {
      'color':     '#80746D',
      'textColor': 'white'
    },
    {
      'color':     '#FFFFFF',
      'textColor': 'black'
    }, {
      'color':     '#A9B6BE',
      'textColor': 'black'
    },
    {
      'color':     '#DDDDDD',
      'textColor': 'black'
    }, {
      'color':     '#BBB3A9',
      'textColor': 'black'
    },
    {
      'color':     '#0065AB',
      'textColor': 'white'
    }, {
      'color':     '#343DAC',
      'textColor': 'white'
    },
    {
      'color':     '#781DA0',
      'textColor': 'white'
    }, {
      'color':     '#9B0D54',
      'textColor': 'white'
    },
    {
      'color':     '#0095D3',
      'textColor': 'black'
    }, {
      'color':     '#9DA3DB',
      'textColor': 'black'
    },
    {
      'color':     '#BE90D6',
      'textColor': 'black'
    }, {
      'color':     '#F1428A',
      'textColor': 'black'
    },
    {
      'color':     '#1D5100',
      'textColor': 'white'
    }, {
      'color':     '#006668',
      'textColor': 'white'
    },
    {
      'color':     '#006690',
      'textColor': 'white'
    }, {
      'color':     '#004A70',
      'textColor': 'white'
    },
    {
      'color':     '#48960C',
      'textColor': 'black'
    }, {
      'color':     '#00AB9A',
      'textColor': 'black'
    },
    {
      'color':     '#00B7D6',
      'textColor': 'black'
    }, {
      'color':     '#0081A7',
      'textColor': 'black'
    },
    {
      'color':     '#C92100',
      'textColor': 'white'
    }, {
      'color':     '#CD3517',
      'textColor': 'white'
    },
    {
      'color':     '#C25400',
      'textColor': 'white'
    }, {
      'color':     '#D28F00',
      'textColor': 'white'
    },
    {
      'color':     '#F52F52',
      'textColor': 'black'
    }, {
      'color':     '#FF5501',
      'textColor': 'black'
    },
    {
      'color':     '#F57600',
      'textColor': 'black'
    }, {
      'color':     '#FFDC0B',
      'textColor': 'black'
    },
  ],
  headers:                [
    {
      name:           'name',
      label:          '标签',
      sort:           ['name'],
    },
    {
      name:            'description',
      label:           '描述',
      sort:             ['description'],
    },
    {
      name:           'creation_time',
      classNames:     'text-right pr-20',
      label:           '创建时间',
      sort:            ['creation_time'],
      width:           175,
    },
  ],
  availableActions: [
    {
      action:   'edit',
      icon:     'icon icon-edit',
      label:    'action.edit',
      bulkable: false,
      single:   true,
    },
    {
      action:   'remove',
      icon:     'icon icon-trash',
      label:    'action.remove',
    },
  ],
  init() {
    this._super(...arguments);
    this.refreshData();
  },
  actions:  {
    addNewLabel() {
      set(this, 'showAddLabelModal', true);
    },
    editLabel(labels) {
      set(this, 'showEditLabelModal', true);
      set(this, 'editingLabel', Object.assign({}, labels[0]));
    },
    promptDelete(labels) {
      set(this, 'showConfirmDeleteModal', true)
      set(this, 'selectedLabels', labels);
    },
    confirmEdit() {
      get(this, 'harbor').eidtLabels(get(this, 'editingLabel')).then(() => {
        set(this, 'editingLabel', null);
        set(this, 'showEditLabelModal', false);
        this.refreshData();
      }).catch((err) => {
        set(this, 'editingLabel', null);
        set(this, 'showEditLabelModal', false);
        this.growl.fromError('修改失败', err.body)
        this.refreshData();
      });
    },
    confirmDelete() {
      get(this, 'harbor').removeLabels(get(this, 'selectedLabels').map((label) => label.id)).then(() => {
        set(this, 'selectedLabels', null);
        set(this, 'showConfirmDeleteModal', false);
        this.refreshData();
      }).catch((err) => {
        set(this, 'selectedLabel', null);
        set(this, 'showConfirmDeleteModal', false);
        this.growl.fromError('删除失败', err.body)
        this.refreshData();
      });
    },
    search(text) {
      this.refreshData(text);
    },
    pageChange(page) {
      set(this, 'page', page);
    },
    refreshLabels() {
      this.refreshData();
    },
    sortChanged(sort) {
      const rawData = [...get(this, 'rawData')];

      rawData.sort((a, b) => {
        if (a[sort.sortBy] > b[sort.sortBy]) {
          return sort.descending ? 1 : -1;
        }
        if (a[sort.sortBy] < b[sort.sortBy]) {
          return sort.descending ? -1 : 1;
        }

        return 0;
      });
      set(this, 'rawData', rawData);
    }
  },
  paramDidChanged: observer('labelParam', function() {
    this.refreshData();
  }),
  scope: computed('labelParam', function() {
    return get(this, 'labelParam.scope') || 'g';
  }),
  projectId: computed('labelParam', function() {
    return get(this, 'labelParam.project_id') || 0;
  }),
  data: computed('rawData', 'page', function() {
    const pageRecords = get(this, 'prefs.tablePerPage');
    const totalCount = get(this, 'totalCount');
    let page = get(this, 'page') || 1;
    const rawData = get(this, 'rawData');

    const maxPage = Math.ceil(totalCount / pageRecords);

    if (page > maxPage) {
      page = maxPage;
    }

    const start = (page - 1) * pageRecords;
    const end = start + Math.min(pageRecords, totalCount - start);

    return rawData.slice(start, end);
  }),
  param: computed('labelParam', function() {
    const labelParam = get(this, 'labelParam');

    return Object.assign({}, labelParam);
  }),
  refreshData(searchText) {
    get(this, 'harbor').fetchLabels(get(this, 'param')).then((resp) => {
      let data = resp;

      data.forEach((d) => {
        d.displayName = d.name;
      });
      if (searchText) {
        data = data.filter((d) => d.name.indexOf(searchText) > -1 || d.description.indexOf(searchText) > -1);
      }
      set(this, 'page', 1)
      set(this, 'rawData', data);
      set(this, 'totalCount', parseInt(resp.headers.map['x-total-count'] || 0))
    });
  },

});