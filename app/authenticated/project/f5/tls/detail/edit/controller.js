import Controller from '@ember/controller';

export default Controller.extend({
  actions: {
    back() {
      return this.transitionToRoute('authenticated.project.f5.tls');
    },

    cancel() {
      this.send('goToPrevious');
    },
  },
});
