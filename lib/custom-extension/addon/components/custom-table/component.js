import { or } from '@ember/object/computed';
import Component from '@ember/component';
import StickyHeader from 'shared/mixins/sticky-table-header';
import layout from './template';
import { computed } from '@ember/object';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service'
import { isArray } from '@ember/array';
import { observer } from '@ember/object'
import { run } from '@ember/runloop';
import { isAlternate, isMore, isRange } from 'shared/utils/platform';

function toggleInput(node, on, primaryKeyNameName) {
  let id = get(node, primaryKeyNameName);

  if ( id ) {
    let input = $(`input[nodeid="${id}"]`); // eslint-disable-line

    if ( input && input.length ) {
      // can't reuse the input ref here because the table has rerenderd and the ref is no longer good
      $(`input[nodeid="${id}"]`).prop('checked', on); // eslint-disable-line

      let tr    = $(`input[nodeid="${id}"]`).closest('tr'); // eslint-disable-line
      let first = true;

      while ( tr && (first || tr.hasClass('sub-row') ) ) {
        tr.toggleClass('row-selected', on);
        tr    = tr.next();
        first = false;
      }
    }
  }
}

export default Component.extend(StickyHeader, {
  prefs:             service(),
  intl:              service(),

  layout,
  data:                 null,
  preSorts:             null,
  sortBy:               null,
  descending:           false,
  headers:              null,
  extraSearchFields:    null,
  extraSearchSubFields: null,
  hasBulkActions:          true,
  hasRowActions:        true,
  search:               true,
  searchToWormhole:     null,
  paging:               true,
  checkWidth:           40,
  actionsWidth:         40,

  availableActions:  null,
  selectedNodes:     null,
  prevNode:          null,
  searchText:        null,
  isVisible:         true,
  page:              1,
  pagingLabel:       'pagination.generic',
  totalCount:         0,
  primaryKeyName:         'id',

  showHeader: or('hasBulkActions', 'searchInPlace'),

  init() {
    this._super(...arguments);

    this.set('selectedNodes', []);

    if ( get(this, 'hasBulkActions') ) {
      this.actionsChanged();
      run.schedule('afterRender', () => {
        let table = $(this.element).find('> TABLE'); // eslint-disable-line
        let self = this; // need this context in click function and can't use arrow func there

        table.on('click', '> TBODY > TR', (e) => {
          self.rowClick(e);
        });

        table.on('mousedown', '> TBODY > TR', (e) => {
          if ( isRange(e) || e.target.tagName === 'INPUT') {
            e.preventDefault();
          }
        });
      });
    }
  },

  didReceiveAttrs() {
    this._super(...arguments);
    if (get(this, 'isVisible')) {
      this.triggerResize();
    }
  },

  actions: {
    pageChange(page) {
      this.sendAction('pageChange', page);
    },
    changeSort(name) {
      if ( this.get('sortBy') === name ) {
        this.set('descending', !this.get('descending'));
      } else {
        this.setProperties({
          descending: false,
          sortBy:     name
        });
      }
      this.send('sortKeyChanged')
    },
    sortKeyChanged() {
      this.sendAction('sortChanged', {
        sortBy:     get(this, 'sortBy'),
        descending: get(this, 'descending'),
      });
    },
    clearSearch() {
      this.set('searchText', '');
    },
    search(e) {
      if (e.keyCode === 13) {
        this.sendAction('search', get(this, 'searchText'));
      }
    },
    executeBulkAction(name, e) {
      e.preventDefault();
      let nodes = get(this, 'selectedNodes');

      if (isAlternate(e)) {
        var available = get(this, 'availableActions');
        var action = available.findBy('action', name);
        let alt = get(action, 'altAction');

        if ( alt ) {
          name = alt;
        }
      }
      this.sendAction(name, nodes);
    },

    executeAction(action) {
      var node = get(this, 'selectedNodes')[0];

      node.send(action);
    },
  },

  // Pick a new sort if the current column disappears.
  headersChanged: observer('headers.@each.name', function() {
    let sortBy = get(this, 'sortBy');
    let headers = get(this, 'headers') || [];

    if ( headers && headers.get('length') ) {
      let cur = headers.findBy('name', sortBy);

      if ( !cur ) {
        run.next(this, function() {
          this.send('changeSort', headers.get('firstObject.name'));
        });
      }
    }
  }),

  dataChanged: observer('data.[]', function() {
    this.cleanupOrphans();
  }),

  pageCountChanged: observer('indexFrom', 'totalCount', function() {
    // Go to the last page if we end up past the last page
    let from = get(this, 'indexFrom');
    let last = get(this, 'totalCount');
    var perPage = get(this, 'perPage');

    if ( get(this, 'page') > 1 && from > last) {
      let page = Math.ceil(last / perPage);

      this.set('page', page);
    }
  }),

  sortKeyChanged: observer('sortBy', function() {
    set(this, 'page', 1);
  }),
  actionsChanged: observer('selectedNodes.[]', function() {
    if (!get(this, 'hasBulkActions')) {
      return;
    }

    let nodes = get(this, 'selectedNodes');
    let disableAll = false;

    if ( !nodes.length ) {
      disableAll = true;
    }

    if (disableAll) {
      get(this, 'availableActions').forEach((a) => {
        set(a, 'enabled', false);
      });
    } else {
      get(this, 'availableActions').forEach((a) => {
        set(a, 'enabled', true);
      });
    }

    // this.set('availableActions', [...get(this, 'availableActions')]);
  }),
  pagedContent: computed('page', 'perPage', 'totalCount', function() {
    const perPage = get(this, 'perPage');
    const totalCount = get(this, 'totalCount');
    const totalPages = Math.ceil(totalCount / perPage);

    return {
      page:       get(this, 'page'),
      perPage,
      totalPages: totalPages > 1 ? totalPages : null,
    };
  }),

  searchInPlace:   computed('search', 'searchToWormhole', function() {
    return get(this, 'search') && !get(this, 'searchToWormhole');
  }),

  perPage: computed('paging', 'prefs.tablePerPage', function() {
    if ( get(this, 'paging') ) {
      return get(this, 'prefs.tablePerPage');
    } else {
      return 100000;
    }
  }),

  // hide bulckActions if data is empty.
  internalBulkActions: computed('hasBulkActions', 'data.[]', function(){
    let bulkActions = get(this, 'hasBulkActions');

    if (bulkActions && get(this, 'data')){
      let data = get(this, 'data');

      return !!data.get('length');
    } else {
      return false;
    }
  }),

  // For data-title properties on <td>s
  dt: computed('headers.@each.{name,label,translationKey}', 'intl.locale', function() {
    let intl = get(this, 'intl');
    let out = {
      select:  `${ intl.t('generic.select')  }: `,
      actions: `${ intl.t('generic.actions')  }: `,
    };

    get(this, 'headers').forEach((header) => {
      let name = get(header, 'name');
      let dtKey = get(header, 'dtTranslationKey');
      let key = get(header, 'translationKey');

      if ( dtKey ) {
        out[name] = `${ intl.t(dtKey)  }: `;
      } else if ( key ) {
        out[name] = `${ intl.t(key)  }: `;
      } else {
        out[name] = `${ get(header, 'label') || name  }: `;
      }
    });

    return out;
  }),

  // Table content
  fullColspan: computed('headers.length', 'hasBulkActions', 'hasRowActions', function() {
    return (get(this, 'headers.length') || 0) + (get(this, 'hasBulkActions') ? 1 : 0 ) + (get(this, 'hasRowActions') ? 1 : 0);
  }),

  // -----
  searchFields: computed('headers.@each.{searchField,name}', 'extraSearchFields.[]', function() {
    let out = headersToSearchField(get(this, 'headers'));

    return out.addObjects(get(this, 'extraSearchFields') || []);
  }),

  subFields: computed('subHeaders.@each.{searchField,name}', 'extraSearchSubFields.[]', function() {
    let out = headersToSearchField(get(this, 'subHeaders'));

    return out.addObjects(get(this, 'extraSearchSubFields') || []);
  }),

  indexFrom: computed('page', 'perPage', function() {
    var current =  get(this, 'page');
    var perPage =  get(this, 'perPage');

    return Math.max(0, 1 + perPage * (current - 1));
  }),

  indexTo: computed('indexFrom', 'perPage', 'data.[]', function() {
    return get(this, 'indexFrom') + (get(this, 'data.length') || 0) - 1;
  }),

  pageCountContent: computed('indexFrom', 'indexTo', 'pagedContent.totalPages', function() {
    let from = get(this, 'indexFrom') || 0;
    let to = get(this, 'indexTo') || 0;
    let count = get(this, 'totalCount') || 0;
    let pages = get(this, 'pagedContent.totalPages') || 0;
    let out = '';

    if ( pages <= 1 ) {
      out = `${ count } Item${  count === 1 ? '' : 's' }`;
    } else {
      out = `${ from } - ${ to } of ${ count }`;
    }

    return out;
  }),

  isAll: computed('selectedNodes.length', 'data.length', {
    get() {
      return get(this, 'selectedNodes.length') === get(this, 'data.length');
    },

    set(key, value) {
      var content = this.get('data');

      if ( value ) {
        this.toggleMulti(content, []);

        return true;
      } else {
        this.toggleMulti([], content);

        return false;
      }
    }
  }),

  cleanupOrphans() {
    // Remove selected items not in the current content
    let content = get(this, 'data');
    let nodesToAdd = [];
    let nodesToRemove = [];

    get(this, 'selectedNodes').forEach((node) => {
      if ( content.includes(node) ) {
        nodesToAdd.push(node);
      } else {
        nodesToRemove.push(node);
      }
    });

    this.toggleMulti(nodesToAdd, nodesToRemove);
  },

  // ------
  // Clicking
  // ------
  rowClick(e) {
    let tagName = e.target.tagName;
    let tgt = $(e.target); // eslint-disable-line

    if ( tagName === 'A'  || tagName === 'BUTTON' || tgt.parents('.btn').length || typeof tgt.data('ember-action') !== 'undefined' || tgt.hasClass('copy-btn') ) {
      return;
    }

    let content = get(this, 'data');
    let selection = get(this, 'selectedNodes');
    let isCheckbox = tagName === 'INPUT' || tgt.hasClass('row-check');
    let tgtRow = $(e.currentTarget); // eslint-disable-line

    if ( tgtRow.hasClass('separator-row') || tgt.hasClass('select-all-check')) {
      return;
    }

    while ( tgtRow && tgtRow.length && !tgtRow.hasClass('main-row') ) {
      tgtRow = tgtRow.prev();
    }

    if ( !tgtRow || !tgtRow.length ) {
      return;
    }

    let nodeId = tgtRow.find('input[type="checkbox"]').attr('nodeid');

    if ( !nodeId ) {
      return;
    }

    // let node = content.findBy(get(this, 'primaryKeyName'), nodeId);
    let node = content.find((item) => `${ item[get(this, 'primaryKeyName')] }` === nodeId);

    if ( !node ) {
      return;
    }

    let isSelected = selection.includes(node);
    let prevNode = get(this, 'prevNode');

    // PrevNode is only valid if it's in the current content
    if ( !prevNode || !content.includes(prevNode) ) {
      prevNode = node;
    }

    if ( isMore(e) ) {
      this.toggleSingle(node);
    } else if ( isRange(e) ) {
      let toToggle = this.nodesBetween(prevNode, node);

      if ( isSelected ) {
        this.toggleMulti([], toToggle);
      } else {
        this.toggleMulti(toToggle, []);
      }
    } else if ( isCheckbox ) {
      this.toggleSingle(node);
    } else {
      this.toggleMulti([node], content);
    }

    this.set('prevNode', node);
  },

  nodesBetween(a, b) {
    let toToggle = [];

    // Ungrouped is much simpler
    let content = get(this, 'data');
    let from = content.indexOf(a);
    let to = content.indexOf(b);

    [from, to] = [Math.min(from, to), Math.max(from, to)];
    toToggle = content.slice(from, to + 1);

    return toToggle;
  },

  toggleSingle(node) {
    let selectedNodes = get(this, 'selectedNodes');

    if ( selectedNodes.includes(node) ) {
      this.toggleMulti([], [node]);
    } else {
      this.toggleMulti([node], []);
    }
  },

  toggleMulti(nodesToAdd, nodesToRemove) {
    let selectedNodes = get(this, 'selectedNodes');
    const primaryKeyName = get(this, 'primaryKeyName');

    if (nodesToRemove.length) {
      // removeObjects doesn't use ArrayProxy-safe looping
      if ( typeof nodesToRemove.toArray === 'function' ) {
        nodesToRemove = nodesToRemove.toArray();
      }
      selectedNodes.removeObjects(nodesToRemove);
      toggle(nodesToRemove, false, primaryKeyName);
    }

    if (nodesToAdd.length) {
      selectedNodes.addObjects(nodesToAdd);
      toggle(nodesToAdd, true, primaryKeyName);
    }

    function toggle(nodes, on, primaryKeyName) {
      run.next(() => {
        nodes.forEach((node) => {
          toggleInput(node, on, primaryKeyName);
        });
      });
    }
  },

});

function headersToSearchField(headers) {
  let out = [];

  (headers || []).forEach((header) => {
    let field = get(header, 'searchField');

    if ( field ) {
      if ( typeof field === 'string' ) {
        out.addObject(field);
      } else if ( isArray(field) ) {
        out.addObjects(field);
      }
    } else if ( field === false ) {
      // Don't add the name
    } else {
      out.addObject(get(header, 'name'));
    }
  });

  return out.filter((x) => !!x);
}
