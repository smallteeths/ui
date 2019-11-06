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
        this.route('repositories', { path: ':project_id/:current_user_role_id/repositories' });
        this.route('repository', { path: ':project_id/:current_user_role_id/repositories/:repository' });
        this.route('members', { path: ':project_id/:current_user_role_id/members' });
        // this.route('replications', { path: ':project_id/:current_user_role_id/replications' });
        this.route('labels', { path: ':project_id/:current_user_role_id/labels' });
        this.route('logs', { path: ':project_id/:current_user_role_id/logs' });
        this.route('configs', { path: ':project_id/:current_user_role_id/configs' });
      });
    });
    this.route('logs', { path: '/logs' } );
  });
  this.route('audit-log', function() {
    this.route('index', { path: '/' });
  });
});
