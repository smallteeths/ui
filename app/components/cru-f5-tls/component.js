import { resolve } from 'rsvp';
import { get, set, computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import NewOrEdit from 'shared/mixins/new-or-edit';
import layout from './template';

const REFERENCE = [
  {
    label: 'BigIp',
    value: 'bigip'
  },
  {
    label: 'Secret',
    value: 'secret'
  }
];

const TERMINATION = [
  {
    label: 'Edge',
    value: 'edge'
  },
  {
    label: 'Reencrypt',
    value: 'reencrypt'
  },
  {
    label: 'Passthrough',
    value: 'passthrough'
  }
];

export default Component.extend(NewOrEdit, {
  intl:  service(),
  scope: service(),
  store: service(),

  layout,
  model:  null,
  mode:   null,
  errors: null,

  referenceChoices:   REFERENCE,
  terminationChoices: TERMINATION,

  primaryResource: alias('model'),

  init() {
    this._super(...arguments);

    if (get(this, 'editMode')) {
      set(this, 'namespace', get(this, 'model.namespace'));
    }
  },
  actions: {
    done() {
      if (this.done) {
        this.done();
      }
    },
    cancel() {
      if (this.cancel) {
        this.cancel();
      }
    },
  },

  addMode: computed('mode', function() {
    return get(this, 'mode') === 'new';
  }),

  editMode: computed('mode', function() {
    return get(this, 'mode') === 'edit';
  }),

  viewMode: computed('mode', function() {
    return get(this, 'mode') === 'view';
  }),

  willSave() {
    const pr = get(this, 'primaryResource');

    if (get(this, 'addMode')) {
      const a = get(pr, 'labels') || {};

      a['f5cr'] = 'true';

      set(pr, 'labels', a);
    }

    // Namespace is required, but doesn't exist yet... so lie to the validator
    let nsId = get(pr, 'namespaceId');

    set(pr, 'namespaceId', '__TEMP__');
    let ok = this.validate();

    set(pr, 'namespaceId', nsId);

    return ok;
  },

  doSave() {
    let pr = get(this, 'primaryResource');

    let namespacePromise = resolve();

    if (get(this, 'addMode')) {
      // Set the namespace ID
      if (get(this, 'namespace.id')) {
        set(pr, 'namespaceId', get(this, 'namespace.id'));
      } else if (get(this, 'namespace')) {
        namespacePromise = get(this, 'namespace').save()
          .then((newNamespace) => {
            set(pr, 'namespaceId', get(newNamespace, 'id'));

            return newNamespace.waitForState('active');
          });
      }
    }

    let self = this;
    let sup = self._super;

    return namespacePromise.then(() => sup.apply(self, arguments));
  },

  validate() {
    let pr = get(this, 'primaryResource');
    let errors = pr.validationErrors() || [];

    errors.pushObjects(get(this, 'namespaceErrors') || []);

    if (errors.length) {
      set(this, 'errors', errors.uniq());

      return false;
    }

    return true;
  },

  doneSaving() {
    this._super(...arguments);
    this.send('done');
  },
});
