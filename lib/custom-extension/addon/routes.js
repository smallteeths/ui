import buildRoutes from 'ember-engines/routes';

export default buildRoutes(function() {
  this.route('image-repo', function() {
    this.route('index', { path: '/' });
    this.route('config', { path: '/config' });
    this.route('registries', { path: '/registries' } );
    this.route('project', { path: '/project' } );
    this.route('log', { path: '/log' } );
  });
});
