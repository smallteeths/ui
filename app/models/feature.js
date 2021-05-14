import Resource from '@rancher/ember-api-store/models/resource';
import { computed, get, set } from '@ember/object';
import { inject as service } from '@ember/service';

var Feature = Resource.extend({
  intl: service(),

  growl: service(),

  type: 'feature',

  canRemove:     false,
  canBulkRemove: false,

  displayState: computed('value', function() {
    return this.value ? this.intl.t('generic.active') : this.intl.t('generic.disabled');
  }),

  stateBackground: computed('value', function() {
    return this.value ? 'bg-success' : 'bg-muted';
  }),

  availableActions: computed('value', function() {
    return [
      {
        label:    'action.activate',
        icon:     'icon icon-play',
        action:   'activate',
        enabled:  !this.value,
        bulkable: true,
      },
      {
        label:    'action.deactivate',
        icon:     'icon icon-stop',
        action:   'deactivate',
        enabled:  this.value,
        bulkable: true,
      },
    ];
  }),

  actions: {
    activate() {
      set(this, 'value', true);

      return this.save().catch((err) => {
        set(this, 'value', false);
        get(this, 'growl').fromError(err.message || err.code || err.error, '');

        return err;
      });
    },
    deactivate() {
      set(this, 'value', false);

      return this.save().catch((err) => {
        set(this, 'value', true)
        get(this, 'growl').fromError(err.message || err.code || err.error, '');

        return err;
      });
    },
  },

});

export default Feature;
