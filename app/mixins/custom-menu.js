import { get } from '@ember/object'
import Mixin from '@ember/object/mixin';
import { inject as service } from '@ember/service'

export default Mixin.create({
  settings:         service(),
  scope:            service(),

  addExtraMenus(out) {
    const extraMenus = get(this, 'settings.extra-menus') || '';

    extraMenus.split(';').forEach((menu) => {
      const currentScope = get(this, 'pageScope');

      const [menuScope, menuLabel, menuUrl = '', strIframeEnabled, scopeId] = menu.split(',');
      const iframeEnabled = strIframeEnabled === 'true' ? true : false

      if ( menuScope === currentScope ) {
        let url = `https://${  menuUrl }`
        let customRoute
        let ctx

        if (scopeId && scopeId !== 'undefined') {
          if (menuScope === 'cluster' && scopeId !== get(this, 'scope.currentCluster.id')) {
            return
          } else if (menuScope === 'project' && scopeId !== get(this, 'scope.currentProject.id')) {
            return
          }
        }

        const isRancherUrl = url.startsWith(window.location.origin)
        const isKubernetesUrl = url.startsWith(`${ window.location.origin }/k8s/clusters`)

        if (isRancherUrl && !isKubernetesUrl) {
          url = url.replace(window.location.origin, '')
        } else {
          if (menuScope === 'global') {
            customRoute = `global-admin.iframe.detail`
            ctx = [encodeURIComponent(url)]
          } else {
            customRoute = `authenticated.${ menuScope }.iframe.detail`
            ctx = [...get(this, 'currentItemContext'), encodeURIComponent(url)]
          }
        }

        url = iframeEnabled ? url : menuUrl
        const clusterId = get(this, 'scope.currentCluster.id')
        const projectId = get(this, 'scope.currentProject.id')

        out.push({
          url:         (url || '').replace(/{clusterId}/g, clusterId).replace(/{projectId}/g, projectId),
          label:       menuLabel,
          scope:       menuScope,
          customRoute,
          ctx,
          iframeEnabled,
        })
      }
    })
  }
})