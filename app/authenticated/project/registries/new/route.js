import Route from '@ember/routing/route';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';

export default Route.extend({
  harbor: service(),

  model(params/* , transition*/) {
    // load harbor account
    const harborConfig = get(this, 'harbor').loadHarborServerUrl().then((harborServer) => {
      if (!harborServer) {
        return {
          harborServer:  '',
          harborAccount: '',
        };
      }
      if (!!get(this, 'access.me.hasAdmin')) {
        return get(this, 'harbor').fetchHarborUserInfo().then((resp) => {
          return {
            harborServer,
            harborAccount: AWS.util.base64.decode(resp.body.value).toString(),
          }
        });
      } else {
        const account = get(this, 'access.me.annotations')['authz.management.cattle.io.cn/harborauth'];

        return {
          harborServer,
          harborAccount: account ? AWS.util.base64.decode(account).toString() : '',
        }
      }
    });

    if (get(params, 'id')) {
      return hash({
        cred: get(this, 'store').find(get(params, 'type'), get(params, 'id'))
          .then( ( cred ) => cred.cloneForNew() ),
        harborConfig
      });
    }

    return hash({
      cred: this.get('store').createRecord({
        type:       'dockerCredential',
        registries: {
          'index.docker.io': {
            username: '',
            password: '',
          }
        }
      }),
      harborConfig
    });
  },

  resetController(controller, isExiting/* , transition*/) {
    if (isExiting) {
      set(controller, 'id', null);
      set(controller, 'type', null);
    }
  },
});
