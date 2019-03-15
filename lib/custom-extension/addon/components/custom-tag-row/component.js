import Component from '@ember/component';
import layout from './template';
import { computed, get } from '@ember/object';
import { htmlSafe } from '@ember/string';


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
  pullCommand:  computed('harborServer', function() {
    const harborServer = get(this, 'harborServer') || '';
    const endpoint = harborServer.indexOf('://') > -1 ? harborServer.substr(harborServer.indexOf('://') + 3) : harborServer;
    const tag = get(this, 'model.name');
    const repo = get(this, 'repo');
    const url = endpoint.endsWith('/') ? `${ endpoint }${ repo }${ tag ? (`:${ tag }`) : '' }` : `${ endpoint }/${ repo }${ tag ? (`:${ tag }`) : '' }`;

    return `docker pull ${ url }`;
  }),
  labels: computed('model.labels', function() {
    const labels = get(this, 'model.labels');

    return labels.map((label) => {
      const color = label.color || '#FFFFFF';
      const font = get(this, 'labelColors').find((c) => c.color === color)
      const border = color === '#FFFFFF' ? '1px solid rgb(161, 161, 161);' : 'none';

      return {
        cssStyle: htmlSafe(`display: inline-block;padding:0 6px 1px;border-radius: 6px;border:${ border };background-color:${ color }; color:${ font && font.textColor }`),
        name:     label.name
      };
    });
  }),
});