import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { get, set, computed, observer } from '@ember/object';
import { alias } from '@ember/object/computed';

export default Controller.extend({
  harbor:                  service(),
  prefs:                   service(),
  queryParams:             ['name'],
  name:                    '',
  page:                    1,
  searchText:              '',
  showCopyDigestModal:     false,
  showConfirmDeleteModal:  false,
  showChangeTagLabelModal: false,
  selectedTag:             null,
  selectedTags:            null,
  labelColors:             [
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
  availableActions: [
    // {
    //   action:   'copyDigest',
    //   icon:     'icon icon-copy',
    //   label:    'imageRepoSection.tagPage.action.copyDigest',
    //   bulkable: false,
    //   single:   true,
    // },
    // {
    //   action:   'addLabel',
    //   icon:     'icon icon-plus',
    //   label:    'imageRepoSection.tagPage.action.addLabel',
    //   bulkable: false,
    //   single:   true,
    // },
    // {
    //   action:   'retag',
    //   icon:     'icon icon-copy',
    //   label:    'imageRepoSection.tagPage.action.retag',
    //   bulkable: false,
    //   single:   true,
    // },
    {
      action:   'remove',
      icon:     'icon icon-trash',
      label:    'action.remove',
      active(selectedRows) {
        if (!selectedRows.length) {
          return false;
        }

        return get(this, 'model.currentUser.has_admin_role') || get(this, 'model.currentUserRoleId') === '1';
      },
    },
  ],
  headers:          [
    {
      name:           'name',
      label:          '标签',
      sort:           ['name'],
    },
    {
      name:            'size',
      label:           '大小',
      sort:             ['size'],
    },
    {
      name:            'pullCommand',
      label:           'Pull命令',
    },
    {
      name:            'author',
      label:           '作者',
      sort:             ['size'],
    },
    {
      name:            'created',
      label:           '创建时间',
      sort:             ['created'],
    },
    {
      name:            'docker_version',
      label:           'Docker版本',
      sort:             ['docker_version'],
    },
    {
      name:           'labels',
      label:           '标签',
    },
  ],
  totalCount:             alias('model.tags.length'),
  actions:    {
    handleCommand(command, data) {
      switch (command) {
      case 'remove':
        this.send('promptDelete', [data])
        break;
      case 'addLabel':
        this.send('addLabel', [data])
        break;
      case 'copyDigest':
        this.send('copyDigest', [data])
        break
      }
    },
    promptDelete(tags) {
      set(this, 'selectedTags', tags);
      set(this, 'showConfirmDeleteModal', true);
    },
    confirmDelete() {
      set(this, 'showConfirmDeleteModal', false);
      const tags = get(this, 'selectedTags');
      const repo = get(this, 'model.repository');

      get(this, 'harbor').removeTags(repo, tags.map((tag) => tag.name)).then(() => {
        this.send('refreshModel');
      }).catch(() => {
        this.send('refreshModel');
      });
    },
    search(text) {
      set(this, 'name', text);
    },
    pageChange(page) {
      set(this, 'page', page);
    },
    sortChanged(sort) {
      const rawData = [...get(this, 'model.tags')];

      rawData.sort((a, b) => {
        if (a[sort.sortBy] > b[sort.sortBy]) {
          return sort.descending ? 1 : -1;
        }
        if (a[sort.sortBy] < b[sort.sortBy]) {
          return sort.descending ? -1 : 1;
        }

        return 0;
      });
      set(this, 'model.tags', rawData);
    },
    remove() {
      console.log(arguments);
    },
    retag() {
      console.log(arguments);
    },
    addLabel(tags) {
      set(this, 'selectedTag', tags[0]);
      set(this, 'showChangeTagLabelModal', true);
    },
    copyDigest(tags) {
      set(this, 'selectedTag', tags[0]);
      set(this, 'showCopyDigestModal', true);
    },
    refresh() {
      this.send('refreshModel');
    },
  },
  nameChanged: observer('name', function() {
    set(this, 'searchText', get(this, 'name'));
  }),
  allLabels:             computed('model.labels', 'model.projectLabels', function() {
    return [...get(this, 'model.labels'), ...get(this, 'model.projectLabels')];
  }),
  data: computed('model.tags', 'name', 'page', function() {
    const pageRecords = get(this, 'prefs.tablePerPage');
    const totalCount = get(this, 'totalCount');
    let page = get(this, 'page') || 1;
    let rawData = get(this, 'model.tags');
    const name = get(this, 'name');

    if (name) {
      rawData = rawData.filter((item) => item.name.indexOf(name) > -1 );
    }
    const maxPage = Math.ceil(totalCount / pageRecords);

    if (page > maxPage) {
      page = maxPage;
    }

    const start = (page - 1) * pageRecords;
    const end = start + Math.min(pageRecords, totalCount - start);



    return rawData.slice(start, end);
  }),
});