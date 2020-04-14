import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { get, set } from '@ember/object';
import { hash } from 'rsvp';

export default Route.extend({
  harbor:       service(),
  access:       service(),
  harborServer: '',
  beforeModel() {
    this._super(...arguments);

    return get(this, 'harbor').loadHarborServerUrl().then((resp) => {
      set(this, 'harborServer', resp);
    });
  },
  model() {
    let harborAccountState
    const a = get(this, 'access.me.annotations');

    if (get(this, 'harborServer')) {
      if (a && a['management.harbor.pandaria.io/synccomplete'] === 'true') {
        harborAccountState = 'syncedAccount'
      } else {
        harborAccountState = 'syncAccount'
      }
    } else {
      harborAccountState = 'waiting'
    }

    return hash({
      harborServer:     get(this, 'harborServer'),
      harborAccountState,
      harborSystemInfo: {},
      account:          {
        username: get(this, 'access.principal.loginName') || get(this, 'access.principal.name'),
        email:    a && a['authz.management.cattle.io.cn/harboremail'] || '',
        password: '',
      },
    });
  },
  afterModel(model) {
    if (model.harborServer) {
      return this.harbor.fetchSystemInfo().then((resp) => {
        set(model, 'harborSystemInfo', resp)
      })
    }
  },
  redirect() {
    if (get(this, 'access.me.hasAdmin')) {
      return this.replaceWith('image-repo.admin-config.index');
    }
  },
  actions: {
    refreshModel() {
      this.refresh();
    }
  },
});
