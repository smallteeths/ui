import buildRoutes from 'ember-engines/routes';

export default buildRoutes(function() {
  // Define your engine's route map here
  this.route('clone-cross-cluster', { path: '/clone-cross-cluster' }, function() {
    this.route('run', { path: '/:workload_id' });
  });
});
