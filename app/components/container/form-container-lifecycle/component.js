import { equal } from '@ember/object/computed';
import { observer, get, set, setProperties } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import layout from './template';
import { scheduleOnce } from '@ember/runloop';
// lifecycle(preStop/postStart) actions:
// exec: { command: [''] }
// httpGet: { host: '', httpHeaders: [ { name: '', value: '' } ], path: '', port: 123, scheme: 'http'}
// tcpSocket: { host: '', port: 123 }

const NONE = 'none';
const TCP = 'tcp';
const HTTP = 'http';
const HTTPS = 'https';
const COMMAND = 'command';

export default Component.extend({
  intl:      service(),

  layout,
  // Inputs
  errors:           [],
  lifecycleHandler: null,

  editing:          true,
  checkType:        null,
  command:          null,
  path:             null,
  host:             null,
  headers:          null,

  isNone:           equal('checkType', NONE),
  isTcp:            equal('checkType', TCP),
  isHttp:           equal('checkType', HTTP),
  isHttps:          equal('checkType', HTTPS),
  isCommand:        equal('checkType', COMMAND),

  init() {
    this._super(...arguments);

    const initial = get(this, 'initialHandler');
    let handler;
    let type = NONE;

    if (initial) {
      handler = Object.assign({}, initial);
      if ( get(handler, 'tcp') ) {
        type = TCP;
      } else if ( get(handler, 'command.length') ) {
        type = COMMAND;
        set(this, 'command', get(handler, 'command'));
      } else if ( get(handler, 'scheme') === 'HTTP' ) {
        type = HTTP;
      } else if ( get(handler, 'scheme') === 'HTTPS' ) {
        type = HTTPS;
      }

      if ( type === HTTP || type === HTTPS ) {
        const originalHeaders = get(handler, 'httpHeaders') || [];
        let host = null;
        const headers = {};

        originalHeaders.forEach((h) => {
          const name = (get(h, 'name') || '');
          const value = (get(h, 'value') || '');

          if ( name.toLowerCase() === 'host' ) {
            host = value;
          } else {
            set(headers, name, value);
          }
        });

        set(this, 'path', get(handler, 'path'));
        set(this, 'host', host);
        set(this, 'headers', headers);
      }
    } else {
      handler = get(this, 'store').createRecord({ type: 'lifecycle' });
    }

    set(this, 'lifecycleHandler', handler);
    set(this, 'checkType', type);
    this.validate();

    scheduleOnce('afterRender', () => {
      this.checkChanged()
    });
  },

  checkChanged: observer('path', 'host', 'headers', 'checkType', 'command', function() {
    const handler = get(this, 'lifecycleHandler');

    if ( get(this, 'isNone') ) {
      if (this.changed) {
        this.changed(null);
      }

      return;
    }

    setProperties(handler, { tcp: get(this, 'isTcp') });

    if (get(this, 'isHttp') || get(this, 'isHttps')) {
      const host = get(this, 'host');
      const httpHeaders = [];

      if ( host ) {
        httpHeaders.push({
          name:  'Host',
          value: host
        })
      }

      const headers = get(this, 'headers') || {};

      Object.keys(headers).forEach((header) => {
        httpHeaders.push({
          name:  header,
          value: get(headers, header)
        })
      })

      setProperties(handler, {
        httpHeaders,
        path:        get(this, 'path') || '/',
        scheme:      get(this, 'isHttps') ? 'HTTPS' : 'HTTP'
      });
    } else {
      setProperties(handler, {
        path:        null,
        httpHeaders: null,
      });
    }

    if (get(this, 'isCommand')) {
      set(handler, 'command', get(this, 'command') );
    } else {
      set(handler, 'command', null);
    }

    if (this.changed) {
      this.changed(handler);
    }
  }),

  validate: observer('isNone', 'isCommand', 'lifecycleHandler.command.[]', 'lifecycleHandler.port', function() {
    var errors = [];

    set(this, 'errors', errors);

    if ( get(this, 'isNone') ) {
      return;
    }

    if ( get(this, 'isCommand') ) {
      if ( !get(this, 'lifecycleHandler.exec.command.length') ) {
        errors.push('Container lifecycle hook action command is required');
      }
    } else {
      if ( !get(this, 'lifecycleHandler.port') ) {
        errors.push('Container lifecycle hook action port is required');
      }
    }
  }),
});
