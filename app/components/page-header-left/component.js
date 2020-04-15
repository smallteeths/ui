import { get, set, setProperties } from '@ember/object';
import { computed, observer } from '@ember/object';
import { alias } from '@ember/object/computed';
import Component from '@ember/component';
import { inject as service } from '@ember/service'
import layout from './template';
import C from 'shared/utils/constants';
import { get as getTree } from 'shared/utils/navigation-tree';
import { run } from '@ember/runloop';

function fnOrValue(val, ctx) {
  if ( typeof val === 'function' ) {
    return val.call(ctx);
  } else {
    return val;
  }
}


export default Component.extend({
  // Injections
  intl:             service(),
  scope:            service(),
  settings:         service(),
  access:           service(),
  prefs:            service(),

  layout,
  // Inputs
  pageScope:        null,

  // Component options
  tagName:          'aside',
  classNames:       ['page-header-left page-header-left-dark'],
  dropdownSelector: '.navbar .dropdown',

  stacks:           null,

  // This computed property generates the active list of choices to display
  navTree:       null,
  clusterId:        alias('scope.currentCluster.id'),
  cluster:          alias('scope.currentCluster'),
  projectId:        alias('scope.currentProject.id'),
  project:          alias('scope.currentProject'),
  accessEnabled:    alias('access.enabled'),

  init() {
    this._super(...arguments);
    get(this, 'intl.locale');

    setProperties(this, {
      stacks:      get(this, 'store').all('stack'),
      hosts:       get(this, 'store').all('host'),
      stackSchema: get(this, 'store').getById('schema', 'stack'),
    });

    run.once(this, 'updateNavTree');
  },
  willRender() {
    if ($('BODY').hasClass('touch') && $('header > nav').hasClass('nav-open')) {// eslint-disable-line
      run.later(() => {
        $('header > nav').removeClass('nav-open');// eslint-disable-line
      });
    }
  },

  actions: {
    toogleExpand(selected) {
      get(this, 'navTree').forEach((item) => {
        if ( item === selected ) {
          set(item, 'expanded', !get(item, 'expanded'));
        } else {
          set(item, 'expanded', false);
        }
      });
    },
  },
  shouldUpdateNavTree: observer(
    'pageScope',
    'clusterId',
    'cluster.isReady',
    'projectId',
    'stacks.@each.group',
    `prefs.${ C.PREFS.ACCESS_WARNING }`,
    'access.enabled',
    'intl.locale',
    function() {
      run.scheduleOnce('afterRender', this, 'updateNavTree');
    }
  ),

  // beyond things listed in "Inputs"
  hasProject: computed('project', function() {
    return !!get(this, 'project');
  }),

  // Hackery: You're an owner if you can write to the 'system' field of a stack
  isOwner: computed('stackSchema.resourceFields.system.update', function() {
    return !!get(this, 'stackSchema.resourceFields.system.update');
  }),

  updateNavTree() {
    const currentScope = get(this, 'pageScope');

    const out = getTree().filter((item) => {
      if ( typeof get(item, 'condition') === 'function' ) {
        if ( !item.condition.call(this) ) {
          return false;
        }
      }

      if ( get(item, 'scope') && get(item, 'scope') !== currentScope ) {
        return false;
      }

      const itemRoute = fnOrValue(get(item, 'route'), this);
      const itemContext = (get(item, 'ctx') || []).map( (prop) =>  fnOrValue(prop, this));

      setProperties(item, {
        localizedLabel: fnOrValue(get(item, 'localizedLabel'), this),
        label:          fnOrValue(get(item, 'label'), this),
        route:          itemRoute,
        ctx:            itemContext,
        icon:           get(item, 'icon'),
        submenu:        fnOrValue(get(item, 'submenu'), this),
      });

      set(item, 'submenu', ( get(item, 'submenu') || [] ).filter((subitem) => {
        if ( typeof get(subitem, 'condition') === 'function' && !subitem.condition.call(this) ) {
          return false;
        }

        const subItemRoute = fnOrValue(get(subitem, 'route'), this);
        const subItemContext = ( get(subitem, 'ctx') || [] ).map( (prop) => fnOrValue(prop, this));

        setProperties(subitem, {
          localizedLabel: fnOrValue(get(subitem, 'localizedLabel'), this),
          label:          fnOrValue(get(subitem, 'label'), this),
          route:          subItemRoute,
          ctx:            subItemContext,
        });

        return true;
      }));

      return true;
    });

    const extraMenus = get(this, 'settings.extra-menus') || '';

    extraMenus.split(';').forEach((menu) => {
      const [menuScope, menuLabel, menuUrl = ''] = menu.split(',');

      if ( menuScope === currentScope ) {
        let url = menuUrl

        if (menuUrl.startsWith('http://') || menuUrl.startsWith('https://')) {
          url = `/iframe/${ encodeURIComponent(menuUrl) }`
        }

        let customRoute
        let ctx

        if (menuScope === 'global') {
          customRoute = `global-admin.iframe.detail`
          ctx = [encodeURIComponent(menuUrl)]
        } else {
          customRoute = `authenticated.${ menuScope }.iframe.detail`
          ctx = [...get(this, 'currentItemContext'), encodeURIComponent(menuUrl)]
        }

        out.push({
          url,
          label:       menuLabel,
          scope:       menuScope,
          customRoute,
          ctx,
        })
      }
    })

    out.forEach((item) => {
      if (item.submenu && !item.route) {
        if (item.submenu.some((ele) => {
          return ele.initExpand === get(this, 'application.currentRouteName')
        })) {
          set(item, 'expanded', true);
        }
      }
    })

    set(this, 'navTree', out);
  },

  // Utilities you can use in the condition() function to decide if an item is shown or hidden,
});
