import Component from '@ember/component';
import layout from './template';
import { computed, get } from '@ember/object';
import { htmlSafe } from '@ember/string';
import moment from 'moment';

const TIME = '0001-01-01T00:00:00.000Z'

export default Component.extend({
  layout,
  model:        null,
  isLocal:      null,
  tagName:      'TR',
  classNames:   'main-row',
  harborServer: null,
  repo:         null,
  labelColors:            [
    {
      'color':     '#000000',
      'textColor': 'white'
    }, {
      'color':     '#61717D',
      'textColor': 'white'
    },
    {
      'color':     '#737373',
      'textColor': 'white'
    }, {
      'color':     '#80746D',
      'textColor': 'white'
    },
    {
      'color':     '#FFFFFF',
      'textColor': 'black'
    }, {
      'color':     '#A9B6BE',
      'textColor': 'black'
    },
    {
      'color':     '#DDDDDD',
      'textColor': 'black'
    }, {
      'color':     '#BBB3A9',
      'textColor': 'black'
    },
    {
      'color':     '#0065AB',
      'textColor': 'white'
    }, {
      'color':     '#343DAC',
      'textColor': 'white'
    },
    {
      'color':     '#781DA0',
      'textColor': 'white'
    }, {
      'color':     '#9B0D54',
      'textColor': 'white'
    },
    {
      'color':     '#0095D3',
      'textColor': 'black'
    }, {
      'color':     '#9DA3DB',
      'textColor': 'black'
    },
    {
      'color':     '#BE90D6',
      'textColor': 'black'
    }, {
      'color':     '#F1428A',
      'textColor': 'black'
    },
    {
      'color':     '#1D5100',
      'textColor': 'white'
    }, {
      'color':     '#006668',
      'textColor': 'white'
    },
    {
      'color':     '#006690',
      'textColor': 'white'
    }, {
      'color':     '#004A70',
      'textColor': 'white'
    },
    {
      'color':     '#48960C',
      'textColor': 'black'
    }, {
      'color':     '#00AB9A',
      'textColor': 'black'
    },
    {
      'color':     '#00B7D6',
      'textColor': 'black'
    }, {
      'color':     '#0081A7',
      'textColor': 'black'
    },
    {
      'color':     '#C92100',
      'textColor': 'white'
    }, {
      'color':     '#CD3517',
      'textColor': 'white'
    },
    {
      'color':     '#C25400',
      'textColor': 'white'
    }, {
      'color':     '#D28F00',
      'textColor': 'white'
    },
    {
      'color':     '#F52F52',
      'textColor': 'black'
    }, {
      'color':     '#FF5501',
      'textColor': 'black'
    },
    {
      'color':     '#F57600',
      'textColor': 'black'
    }, {
      'color':     '#FFDC0B',
      'textColor': 'black'
    },
  ],
  actions: {
    handleMenuClick(command) {
      this.sendAction('command', command, get(this, 'model'));
    }
  },
  digest: computed('model.digest', function() {
    return get(this, 'model.digest') ? get(this, 'model.digest').slice(0, 15) : '';
  }),
  hasPullTime: computed('model.pull_time', function() {
    return get(this, 'model.pull_time') !== TIME
  }),
  hasPushTime: computed('model.push_time', function() {
    return get(this, 'model.push_time') !== TIME
  }),
  resourceActions: computed('currentUser', 'currentUserRoleId', function() {
    const developerRoleOrAbove = `${ get(this, 'currentUserRoleId') }` === '2' || `${ get(this, 'currentUserRoleId') }` === '1' || get(this, 'currentUser.sysadmin_flag');
    const hasProjectAdminRole = `${ get(this, 'currentUserRoleId') }` === '1' || get(this, 'currentUser.sysadmin_flag');
    const hasProjectMasterRole = `${ get(this, 'currentUserRoleId') }` === '4' || get(this, 'currentUser.sysadmin_flag');

    const actions = [
      {
        label:  'imageRepoSection.tagPage.action.copyDigest',
        icon:   'icon icon-copy',
        action: 'copyDigest'
      }
    ];

    if (developerRoleOrAbove || hasProjectMasterRole) {
      actions.push({
        label:  'imageRepoSection.tagPage.action.addLabel',
        icon:   'icon icon-plus',
        action: 'addLabel'
      });
    }
    if (hasProjectAdminRole || hasProjectMasterRole) {
      actions.push({
        label:  'action.remove',
        icon:   'icon icon-trash',
        action: 'remove'
      });
    }

    return actions;
  }),
  pullCommand:  computed('harborServer', function() {
    const harborServer = get(this, 'harborServer') || '';
    const endpoint = harborServer.indexOf('://') > -1 ? harborServer.substr(harborServer.indexOf('://') + 3).replace(/\/+$/, '') : harborServer.replace(/\/+$/, '');
    const tag = get(this, 'model.digest');
    const repo = get(this, 'repo');
    const url = `${ endpoint }/${ repo }${ tag ? `@${ tag }` : '' }`;

    return `docker pull ${ url }`;
  }),
  labels: computed('model.labels', function() {
    const labels = get(this, 'model.labels');

    return labels ? labels.map((label) => {
      const color = label.color || '#FFFFFF';
      const font = get(this, 'labelColors').find((c) => c.color === color)

      return {
        cssStyle:       htmlSafe(`overflow: hidden;max-width:300px;font-size:12px;display:inline-block;padding:0 6px;border: 1px solid rgb(161, 161, 161); border-radius: 2px;background-color:${ color }; color:${ font && font.textColor }`),
        iconCssStyle:   htmlSafe(`margin-right: 10px; position: relative;top: 3360px;filter: drop-shadow(${ font && font.textColor } 0px -3358px);`),
        name:           label.name,
        classNames:     label.scope === 'g' ? 'icon icon-user' : 'icon icon-tag',
      };
    }) : ''
  }),
  tags: computed('model.tags', function() {
    return get(this, 'model.tags') && get(this, 'model.tags').length > 0 ? `${ get(this, 'model.tags')[0].name } (${ get(this, 'model.tags').length })` : ''
  }),
  tagsTooltipModel: computed('model.tags', function() {
    return get(this, 'model.tags') && get(this, 'model.tags').length > 0 ? get(this, 'model.tags').map((item) => {
      return {
        name:     item.name,
        pullTime: item.pull_time !== TIME ? moment(item.pull_time).fromNow() : '',
        pushTime: item.push_time !== TIME ? moment(item.push_time).fromNow() : '',
      }
    }) : []
  }),
  size: computed('model.size', function() {
    return this.sizeTransform(get(this, 'model.size'));
  }),
  sizeTransform(tagSize) {
    let size = Number.parseInt(tagSize);

    if (Math.pow(1024, 1) <= size && size < Math.pow(1024, 2)) {
      return `${ (size / Math.pow(1024, 1)).toFixed(2) }KB`;
    } else if (Math.pow(1024, 2) <= size && size < Math.pow(1024, 3)) {
      return  `${ (size / Math.pow(1024, 2)).toFixed(2) }MB`;
    } else if (Math.pow(1024, 3) <= size && size < Math.pow(1024, 4)) {
      return  `${ (size / Math.pow(1024, 3)).toFixed(2) }GB`;
    } else {
      return `${ size }B`;
    }
  }
});
