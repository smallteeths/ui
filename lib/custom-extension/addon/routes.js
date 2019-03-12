import buildRoutes from 'ember-engines/routes';

export default buildRoutes(function() {
  this.route('image-repo', function() {
    this.route('index', { path: '/' });
    this.route('admin-config', function() {
      this.route('index', { path: '/' });
    });
    this.route('user-config', function() {
      this.route('index', { path: '/' });
    });
    this.route('registries', { path: '/registries' } );
    this.route('projects', function() {
      this.route('index',  { path: '/' });
      this.route('detail', function() {
        this.route('repositories', { path: ':project_id/repositories' });
        this.route('members', { path: ':project_id/members' });
        this.route('replications', { path: ':project_id/replications' });
        this.route('labels', { path: ':project_id/labels' });
        this.route('logs', { path: ':project_id/logs' });
        this.route('configs', { path: ':project_id/configs' });
      });
    });
    this.route('logs', { path: '/logs' } );
  });
});
