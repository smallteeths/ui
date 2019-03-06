import buildRoutes from 'ember-engines/routes';

export default buildRoutes(function() {
  this.route('image-repo', function() {
    this.route('index', { path: '/' });
    this.route('adminConfig', { path: '/adminConfig' });
    this.route('userConfig', { path: '/userConfig' });
    this.route('registries', { path: '/registries' } );
    this.route('projects', function() {
      this.route('index',  { path: '/' });
      this.route('detail',  { path: '/:project_id' });
    });
    this.route('logs', { path: '/logs' } );
  });
});
