import Route from '@ember/routing/route';
export default Route.extend({
  model(param) {
    return { projectId: param.project_id };
  }
});