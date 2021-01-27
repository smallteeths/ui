import Controller from '@ember/controller';

export default Controller.extend({
  queryParams:  ['type'],
  controllerId: null,

  actions: {
    done() {
      this.send('goToPrevious', 'authenticated.project.f5.controllers.index');
    },

    cancel() {
      this.send('goToPrevious', 'authenticated.project.f5.controllers.index');
    },
  },
});
