import Route from '@ember/routing/route';
import RSVP from 'rsvp';
import { get } from '@ember/object';
import { inject as service } from '@ember/service';
import C from 'shared/utils/constants';
import VerifyAuth from 'ui/mixins/verify-auth';


export default Route.extend(VerifyAuth, {
  cas:         service(),
  globalStore: service(),

  model(params/* , transition */) {
    function reply(err, ticket) {
      try {
        window.opener.window.onAuthTest(err, ticket);
        setTimeout(() => {
          window.close();
        }, 250);

        return new RSVP.promise();
      } catch (e) {
        window.close();
      }
    }

    if (get(params, 'ticket') && window.opener) {
      reply(params.error_description, params.ticket);
    }

    if (get(params, 'ticket') && !window.opener) {
      let ghProvider = get(this, 'access.providers').findBy('id', 'cas');

      return ghProvider.doAction('login', {
        ticket:       get(params, 'ticket'),
        responseType: 'cookie',
        description:  C.SESSION.DESCRIPTION,
        ttl:          C.SESSION.TTL,
      }).then(() => {
        return get(this, 'access').detect()
          .then(() => this.transitionTo('authenticated'));
      });
    }
  }
});
