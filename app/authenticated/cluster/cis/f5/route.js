import Route from '@ember/routing/route';
import { get } from '@ember/object';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';
import { alias } from '@ember/object/computed';

export default Route.extend({
  scope:       service(),
  globalStore: service(),
  catalog:     service(),
  intl:        service(),

  currentCluster: alias('scope.currentCluster'),

  model() {
    const PREFIX = 'cattle-global-data';
    const F5CIS = 'system-library-rancher-f5cis';

    const store = get(this, 'globalStore');

    const cluster = get(this, 'scope.currentCluster');
    const project = get(cluster, 'systemProject');

    let fetchApps = [];

    if ( project && get(cluster, 'enableF5CIS') ) {
      fetchApps = store.rawRequest({
        url:    `/v3/project/${ get(project, 'id') }/apps`,
        method: 'GET',
      }).then((res) => {
        const out = [];
        const apps = get(res, 'body.data') || [];
        const clusterApp = apps.findBy('name', 'cluster-f5cis');

        if ( clusterApp ) {
          out.push(store.createRecord(clusterApp));
        }

        return out;
      });
    }

    return hash({
      apps:      fetchApps,
      templates: get(this, 'catalog').fetchTemplates()
    }).then((hash) => {
      const template = get(hash, 'templates.catalog').findBy('id', `${ PREFIX }:${ F5CIS }`);

      if (template) {
        return {
          apps:          hash.apps,
          versionConfig: {
            versionLinks:   get(template, 'versionLinks'),
            defaultVersion: get(template, 'defaultVersion'),
          },
          f5Ready: true
        }
      } else {
        return {
          apps:    hash.apps,
          f5Ready: false
        }
      }
    });
  },
  redirect() {
    if (get(this, 'currentCluster.id') === 'local'){
      this.controllerFor('application').set('error', { message: get(this, 'intl').t('f5CISPage.authError'), })
      this.transitionTo('failWhale');
    }
  },
});
