import Mixin from '@ember/object/mixin';
import { get, set } from '@ember/object';
import { requiredError } from 'shared/utils/util';

export default Mixin.create({
  answers:        null,
  optionalFields: null,
  name:           null,

  init() {
    this._super(...arguments);

    Object.keys(this.answers).forEach((key) => {
      if ( this.initAnswers && this.initAnswers[this.answers[key]]) {
        set(this, key, this.initAnswers[this.answers[key]]);
      }

      this.addObserver(key, this, () => {
        const objectStorageConfig = {};

        Object.keys(this.answers).forEach((key) => {
          const value = get(this, key);

          if (value) {
            objectStorageConfig[this.answers[key]] = value;
          }
        });

        set(this, 'model.objectStorageConfig', objectStorageConfig);
        this.validate();
      });
    });
  },

  validate() {
    const errors = [];

    Object.keys(this.answers).forEach((key) => {
      if ( !get(this, key) && ((this.optionalFields || []).indexOf(key) === -1 ) ) {
        errors.pushObject(requiredError(`globalMonitoringPage.store.s3.${ key }.label`));
      }
    })

    set(this, 'model.objectStorageConfigErrors', errors);

    return errors;
  }

});
