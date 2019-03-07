import Controller from '@ember/controller';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';

export default Controller.extend({
  harbor:                 service(),
  growl:                    service(),
  queryParams:            ['page', 'name'],
  page:                   1,
  name:                   '',
  showConfirmDeleteModal: false,
  showAddProjectModal:    false,
  selectedProjects:       [],
  headers:                [
    {
      name:           'name',
      label:          '项目名称',
      width:          100,
    },
    {
      name:            'metadata.public',
      label:           '访问级别',
    },
    {
      name:           'current_user_role_id',
      label:          '角色',
    },
    {
      name:           'repo_count',
      label:           '镜像仓库数',
    },
    {
      name:           'chartCount',
      label:          'Helm Chart 数目',
    },
    {
      name:           'creation_time',
      classNames:     'text-right pr-20',
      label:           '创建时间',
      width:          175,
    },
  ],
  availableActions: [
    {
      action:   'remove',
      icon:     'icon icon-trash',
      label:    'action.remove',
    },
  ],
  actions:     {
    pageChange(page) {
      this.transitionToRoute({ queryParams: { page } });
    },
    refresh() {
      this.send('refreshModel');
    },
    addNewProject() {
      set(this, 'showAddProjectModal', true);
    },
    search(text) {
      this.transitionToRoute({ queryParams: { name: text } });
    },
    promptDelete(projects) {
      set(this, 'showConfirmDeleteModal', true)
      set(this, 'selectedProjects', projects);
    },
    confirmDelete() {
      const projects = get(this, 'selectedProjects');

      if (projects && projects.length > 0) {
        get(this, 'harbor').removeProjects(projects.map((p) => p.project_id)).then(() => {
          set(this, 'selectedProjects', null);
          set(this, 'showConfirmDeleteModal', false);
          this.send('refreshModel');
        }).catch((err) => {
          set(this, 'selectedProjects', null);
          set(this, 'showConfirmDeleteModal', false);
          this.send('refreshModel');
          this.growl.error('删除失败', err.body)
        });
      }
    },
  }
});