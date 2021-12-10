import { get, computed } from '@ember/object';
import { inject as service } from '@ember/service';
import Controller from '@ember/controller';

const HEADERS = [
  {
    name:           'state',
    sort:           ['sortState', 'displayName'],
    searchField:    'displayState',
    translationKey: 'generic.state',
    width:          120
  },
  {
    name:           'name',
    sort:           ['displayName'],
    searchField:    'displayName',
    translationKey: 'generic.name',

  },
];

export default Controller.extend({
  intl:         service(),
  globalStore:  service(),
  modalService: service('modal'),
  headers:      HEADERS,
  refreshing:   false,

  actions: {
    addNewOperator() {
      this.get('modalService').toggleModal('modal-edit-operator', {
        name:             'ackoperatorsetting',
        url:              null,
        active:           true,
        mode:             'new',
        createdProviders: this.rows.map((item) => item.id),
        callback:              () => {
          setTimeout(() => {
            this.send('refreshModel');
          }, 500)
        },
      });
    },
  },

  rows: computed('intl', 'model.operators.content', function() {
    // possibly add some search here
    let operators    = get(this, 'model.operators.content');

    return operators;
  }),
});
