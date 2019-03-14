import Controller from '@ember/controller';
import { observer, get, set } from '@ember/object'
import { inject as service } from '@ember/service';

export default Controller.extend({
  harbor:                 service(),
  saveDisabled:           true,
  cancelDisabled:         true,
  saving:                 false,
  actions:                {
    savePublicConfig() {
      let params = {};

      Object.assign(params, get(this, 'model.metaData'))
      params.public ? params.public = 'true' : params.public = 'false';
      get(this, 'harbor').setProjectPublic( { metadata: params }, get(this, 'model.projectId')).then(() => {   
        set(this, 'saving', false)
        this.send('refreshModel');
      }).catch(() => {
        set(this, 'saving', false)
        this.send('refreshModel');
      })
    },
    cancelPublicConfig() {
      set(this, 'model.metaData.public', !get(this, 'model.metaData.public'))
    },
  },
  actionsChanged: observer('model.metaData.public', (val) => {
    if (get(val, 'model.openOrTransparent')){
      set(val, 'saveDisabled', true)
      set(val, 'cancelDisabled', true)
      set(val, 'model.openOrTransparent', false)
    } else {
      set(val, 'saveDisabled', false)
      set(val, 'cancelDisabled', false)
      set(val, 'model.openOrTransparent', true)
    }
  }),
});