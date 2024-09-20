import Route from '@ember/routing/route';
import { hash } from 'rsvp';
import { get, set } from '@ember/object'
import { inject as service } from '@ember/service';
import { on } from '@ember/object/evented';
import C from 'ui/utils/constants';

export default Route.extend({
  globalStore:  service(),
  scope:        service(),
  cookies:      service(),

  model(/* params, transition */) {
    const cs = this.globalStore;
    const clusterId = get(this.scope, 'currentCluster.id');

    let systemProject = {}

    if (get(this, 'scope.currentCluster.projects')) {
      systemProject = get(this, 'scope.currentCluster.projects').find((project) => project.name === 'System' )
    }

    let systemProjectId = systemProject && systemProject.id ? systemProject.id : ''

    // Find alert manager template for alertmanger-notification-template
    const apiMode = this.get(`cookies.${ C.COOKIE.API_MODE }`);
    let secret = systemProjectId ? get(this, 'globalStore').rawRequest({ url: `/v3/project/${ systemProjectId }/namespacedsecrets?limit=-1&sort=name${ apiMode ? '&_power=true' : '' }` }).then((res) => {
      if ( res && res.body && res.body.data) {
        let notificationSecret = res.body.data.find((item) => item.name === 'alertmanager-default-notification-template')

        return { notificationSecret: notificationSecret || {} }
      }

      return {}
    }) : {}

    let notificationtemplate = get(this, 'globalStore').rawRequest({ url: `/v3/notificationtemplates` }).then((res) => {
      if ( res && res.body && res.body.data ) {
        let currentnotificationtemplate = res.body.data.find((item) => item.clusterId === clusterId)

        return currentnotificationtemplate ? currentnotificationtemplate : {}
      }

      return {}
    }).catch(() => {
      return {}
    })

    return hash({
      notifiers: cs.find('notifier', null, { filter: { clusterId } }).then(() => cs.all('notifier')),
      secret,
      notificationtemplate,
      systemProjectId,
      clusterId,
    });
  },

  actions: {
    refreshModel() {
      this.refresh();
    }
  },

  setDefaultRoute: on('activate', function() {
    set(this, `session.${ C.SESSION.CLUSTER_ROUTE }`, 'authenticated.cluster.notifier');
  }),
});
