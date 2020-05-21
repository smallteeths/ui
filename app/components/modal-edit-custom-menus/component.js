import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import ModalBase from 'shared/mixins/modal-base';
import layout from './template';
import { get, set, setProperties } from '@ember/object';
import C from 'shared/utils/constants';

const GLOBAL = 'global'
const CLUSTER = 'cluster'
const PROJECT = 'project'

export default Component.extend(ModalBase, {
  settings:          service(),
  globalStore:       service(),
  router:            service(),
  growl:             service(),
  intl:              service(),

  layout,
  classNames:        ['modal-edit-setting', 'span-8', 'offset-2'],

  model:             alias('modalService.modalOpts'),
  extraMenus:        alias('settings.extraMenus'),

  init() {
    this._super(...arguments);
    const extraMenus = get(this, 'extraMenus')
    const globalMenus = []
    const clusterMenus = []
    const projectMenus = []

    if (extraMenus) {
      const menus = extraMenus.split(';')

      menus.map((menu) => {
        const [scope, label, url, strIframeEnabled] = menu.split(',');
        const iframeEnabled = strIframeEnabled === 'true' ? true : false

        switch (scope) {
        case 'global':
          globalMenus.pushObject({
            label,
            url,
            iframeEnabled,
          })
          break;
        case 'cluster':
          clusterMenus.pushObject({
            label,
            url,
            iframeEnabled,
          })
          break;
        case 'project':
          projectMenus.pushObject({
            label,
            url,
            iframeEnabled,
          })
          break;
        default:
          break;
        }
      })

      setProperties(this, {
        globalMenus,
        clusterMenus,
        projectMenus,
      })
    }
  },

  actions: {
    save(cb) {
      const {
        globalMenus = [], clusterMenus = [], projectMenus = [], globalStore
      } = this

      const allMenus = [...globalMenus, ...clusterMenus, ...projectMenus]
      const filter = allMenus.filter((m) => (get(m, 'url') || '').startsWith('http://'))

      if (get(filter, 'length') > 0) {
        set(this, 'errors', [get(this, 'intl').t('customMenus.index.protocalInvalid')])
        cb(false)

        return
      }

      const globalStr = globalMenus.map((m) => {
        return `${ GLOBAL },${ m.label },${ m.url },${ m.iframeEnabled }`
      }).join(';')

      const clusterStr = clusterMenus.map((m) => {
        return `${ CLUSTER },${ m.label },${ m.url },${ m.iframeEnabled }`
      }).join(';')

      const projectStr = projectMenus.map((m) => {
        return `${ PROJECT },${ m.label },${ m.url },${ m.iframeEnabled }`
      }).join(';')

      const out = [globalStr, clusterStr, projectStr].filter((str) => str !== '').join(';')
      const data = {
        name:  C.SETTING.EXTRA_MENUS,
        value: out,
      }
      const extraMenus = get(this, 'settings.asMap.extra-menus')

      const url = extraMenus ? `/v3/settings/${ C.SETTING.EXTRA_MENUS }` : `/v3/settings`
      const method = extraMenus ? 'PUT' : 'POST'

      globalStore.rawRequest({
        url,
        method,
        data,
      }).then(() => {
        globalStore.find('setting', null, { forceReload: true }).then((res) => {
          set(this, 'settings.all', res)
        })
        get(this, 'settings').loadAll()
        cb(true)
        this.send('done')
      }).catch((err) => {
        set(this, 'errors', err)
        cb(false)
      })
    },

    done() {
      this.send('cancel');
      window.location.href = window.location.href;
    },
  }
});
