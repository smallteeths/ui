import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { get } from '@ember/object';
import { hash } from 'rsvp';

export default Route.extend({
  globalStore: service(),
  model() {
    let gs = get(this, 'globalStore');

    return hash({
      casConfig: gs.find('authconfig', 'cas'),
      // principals:   gs.all('principal')
    }).catch( (e) => {
      return e;
    })
  },

  setupController(controller, model) {
    controller.setProperties({
      model,
      confirmDisable: false,
      testing:        false,
      organizations:  get(this, 'session.orgs') || [],
      errors:         null,
    });

    controller.set('saved', true);

    // if (ENV.environment === 'development') {
    //   const authConfig = get(model, 'ssoConfig')
    //   authConfig.setProperties({
    //     clientId: '9Oa58Axf0W',
    //     clientSecret: '576665a3-fa08-4f02-9a66-9d15fa864add',
    //     callBackHostName: 'localhost:8000',
    //   })
    // }
  }
});
