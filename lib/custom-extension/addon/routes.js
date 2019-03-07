import buildRoutes from 'ember-engines/routes';

export default buildRoutes(function() {
  this.route('image-repo', function() {
    this.route('index', { path: '/' });
    this.route('admin-config', function() {
      this.route('index', { path: '/' });
    });
    this.route('user-config', { path: '/user-config' });
    this.route('registries', { path: '/registries' } );
    this.route('projects', function() {
      this.route('index',  { path: '/' });
      this.route('detail',  { path: '/:project_id' });
    });
    this.route('logs', { path: '/logs' } );
  });
});
