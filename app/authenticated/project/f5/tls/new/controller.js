import Controller from '@ember/controller';

export default Controller.extend({
  queryParams: ['tlsId'],
  tlsId:       null,

  actions: {
    done() {
      this.send('goToPrevious', 'authenticated.project.f5.tls.index');
    },

    cancel() {
      this.send('goToPrevious', 'authenticated.project.f5.tls.index');
    },
  },
});
