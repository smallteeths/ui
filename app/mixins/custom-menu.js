import { get } from '@ember/object'
import Mixin from '@ember/object/mixin';
import { inject as service } from '@ember/service'

export default Mixin.create({
  settings:         service(),

  addExtraMenus(out) {
    const extraMenus = get(this, 'settings.extra-menus') || '';

    extraMenus.split(';').forEach((menu) => {
      const currentScope = get(this, 'pageScope');

      const [menuScope, menuLabel, menuUrl = '', strIframeEnabled] = menu.split(',');
      const iframeEnabled = strIframeEnabled === 'true' ? true : false

      if ( menuScope === currentScope ) {
        let url = `https://${  menuUrl }`
        let customRoute
        let ctx

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

        out.push({
          url:         iframeEnabled ? url : menuUrl,
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