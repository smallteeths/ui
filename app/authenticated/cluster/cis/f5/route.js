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

    return hash({ templates: get(this, 'catalog').fetchTemplates() }).then((hash) => {
      const template = get(hash, 'templates.catalog').findBy('id', `${ PREFIX }:${ F5CIS }`);

      if (template) {
        return {
          versionConfig: {
            versionLinks:   get(template, 'versionLinks'),
            defaultVersion: get(template, 'defaultVersion'),
          },
          f5Ready: true
        }
      } else {
        return { f5Ready: false }
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
