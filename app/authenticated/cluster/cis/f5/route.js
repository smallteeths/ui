import Route from '@ember/routing/route';
import { get } from '@ember/object';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';

export default Route.extend({
  scope:       service(),
  globalStore: service(),
  catalog:     service(),

  model() {
    const PREFIX = 'cattle-global-data';
    const F5CIS = 'system-library-rancher-f5cis';

    return hash({
      versionConfig: get(this, 'catalog').fetchTemplate(`${ PREFIX }:${ F5CIS }`).then(({ versionLinks, defaultVersion }) => {
        return {
          versionLinks,
          defaultVersion
        };
      })
    });
  },
});
