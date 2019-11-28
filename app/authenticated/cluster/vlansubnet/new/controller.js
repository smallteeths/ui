import { inject as service } from '@ember/service';
import { get, set, computed } from '@ember/object';
import Controller from '@ember/controller';
import CIDRMatcher from 'cidr-matcher';
import { debouncedObserver } from 'ui/utils/debounce';

const ipv4RegExp = /^(((\d{1,2})|(1\d{2})|(2[0-4]\d)|(25[0-5]))\.){3}((\d{1,2})|(1\d{2})|(2[0-4]\d)|(25[0-5]))$/;

export default Controller.extend({
  vlansubnet:      service(),
  scope:           service(),
  errors:          null,
  ipRangesExisted: null,
  modes:           [
    {
      label: 'bridge',
      value: 'bridge',
    },
    // {
    //   label: 'private',
    //   value: 'private',
    // },
    // {
    //   label: 'vepa',
    //   value: 'vepa',
    // },
    // {
    //   label: 'passthru',
    //   value: 'passthru',
    // }
  ],
  ifaceChoice: [
    {
      label: 'eth1',
      value: 'eth1',
    },
    {
      label: 'eth0',
      value: 'eth0',
    },
  ],
  form:            computed.alias('model.form'),
  init() {
    this._super(...arguments);
  },
  actions: {
    save(cb) {
      if (!this.validate()) {
        cb(false);

        return;
      }
      const form = JSON.parse(JSON.stringify(get(this, 'form')));

      form.spec.vlan = parseInt(form.spec.vlan, 10) || 0;

      const clusterId = get(this, 'model.clusterId');
      const {
        master,
        vlan,
        cidr,
        ranges
      } = form.spec;

      this.hasVlan(master || '', vlan || 0).then(() => {
        // if (result) {
        //   set(this, 'errors', [`master为${ master }且vlan为${ vlan || '空' }, 已经存在`]);
        //   cb(false);

        //   return;
        // }
        if (this.hasIpConflict()) {
          set(this, 'errors', ['当前ip地址范围与已经存在的ip地址范围有冲突']);
          cb(false);

          return;
        }

        if ((!ranges || ranges.length === 0) && this.hasDuplicateValues(cidr)) {
          set(this, 'errors', [`master为${ master }, vlan为${ vlan }, cidr为${ cidr } 的记录已经存在`]);
          cb(false);

          return;
        }

        return this.vlansubnet.createVlansubnets(clusterId, form).then(() => {
          this.resetForm();
          cb(true);
          this.send('goToPrevious');
        });
      }).catch((err) => {
        if (err && err.body && err.body.message) {
          set(this, 'errors', [err.body.message]);
        }
        cb(false);
      });
    },
    cancel() {
      this.resetForm();
      this.send('goToPrevious');
    },
    addIPRange() {
      const ranges = get(this, 'form.spec.ranges').slice();

      ranges.push({
        rangeEnd:   '',
        rangeStart: '',
      });
      set(this, 'form.spec.ranges', ranges);
    },
    removeIPRange(obj) {
      const ranges = get(this, 'form.spec.ranges').filter((r) => r !== obj);

      set(this, 'form.spec.ranges', ranges);
    },
    addRoute() {
      const routes = get(this, 'form.spec.routes').slice();
      const r = {
        dst: '',
        gw:  '',
      };

      if (get(this, 'hasIface')) {
        r.iface = get(this, 'ifaceChoice')[0].value;
      }
      routes.push(r);
      set(this, 'form.spec.routes', routes);
    },
    removeRoute(obj) {
      const routes = get(this, 'form.spec.routes').filter((r) => r !== obj);

      set(this, 'form.spec.routes', routes);
    }
  },
  masterAndVlanDidChanged: debouncedObserver('form.spec.master', 'form.spec.vlan', function() {
    const form = get(this, 'form');
    const { master, vlan } = form.spec;

    if (master) {
      this.hasVlan(master || '', vlan || 0);
    } else {
      set(this, 'ipRangeExistedMsg', null);
    }
  }),
  projects: computed('model.namespaces.@each.displayName', 'model.projects.@each.clusterId', 'scope.currentCluster.id', function() {
    const projects = get(this, 'model.projects').filterBy('clusterId', get(this, 'scope.currentCluster.id')).map((p) => ({
      label: p.name,
      value: p.id.replace(/[:]/g, '-'),
    }));

    projects.unshift({
      label: 'All Projects',
      value: '',
    });

    return projects;
  }),
  ipRangesExistedMsg: computed('ipRangesExisted', function() {
    const ipRanges = get(this, 'ipRangesExisted') || [];

    return ipRanges.filter((r) => r.spec.ranges && r.spec.ranges.length > 0).map((r) => `${ r.spec.ranges.map((item) => `${ item.rangeStart } - ${ item.rangeEnd }`).join(', ') }`).join(', ');
  }),
  hasIface: computed('scope.currentCluster.rancherKubernetesEngineConfig.network.plugin', function() {
    return get(this, 'scope.currentCluster.rancherKubernetesEngineConfig.network') && get(this, 'scope.currentCluster.rancherKubernetesEngineConfig.network.plugin') === 'multus-canal-macvlan';
  }),
  hasVlan(master, vlan) {
    const clusterId = get(this, 'model.clusterId');
    const q = [encodeURIComponent(`master=${ master }`), encodeURIComponent(`vlan=${ vlan }`)]
    const p = { labelSelector: q.join(',') };

    return this.vlansubnet.fetchVlansubnets(clusterId, p).then((resp) => {
      set(this, 'ipRangesExisted', resp.body.items);

      return resp.body.items.length > 0;
    });
  },
  resetForm() {
    set(this, 'ipRangesExisted', null);
  },
  validate() {
    const form = get(this, 'form');
    const errors = [];

    if (form.metadata.name === '') {
      errors.push('名称不能为空');
    }
    const nameReg = /^[a-z0-9A-Z][a-z0-9A-Z_.-]{0,60}[a-z0-9A-Z]$/;

    if (form.metadata.name !== '' && !nameReg.test(form.metadata.name)) {
      errors.push('项目名称由字母、数字、和._-组成，长度不超过62且至少有两个字符并以字母或数字开头');
    }
    if (form.spec.master === '') {
      errors.push('master 不能为空');
    }

    if (form.spec.vlan !== '' && (!/^\d+$/.test(form.spec.vlan) || form.spec.vlan < 2 || form.spec.vlan > 4095)) {
      errors.push('VLAN值应该是2到4095之间的整数');
    }

    if (form.spec.cidr === '') {
      errors.push('CIDR 不能为空');
    }
    const cidrIPV4RegExp = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/\d{1,2}$/;

    if (form.spec.cidr !== '' && !cidrIPV4RegExp.test(form.spec.cidr)) {
      errors.push('CIDR格式错误');
    }

    if (form.spec.gateway && !ipv4RegExp.test(form.spec.gateway)) {
      errors.push('Gateway IP 格式错误');
    }
    if (form.spec.ranges.some((r) => !ipv4RegExp.test(r.rangeEnd) || !ipv4RegExp.test(r.rangeStart))) {
      errors.push('IP Ranges 中，存在IP地址格式不正确的记录');
    } else if (form.spec.ranges.some((r) => !this.ip4CIDRContains(form.spec.cidr, r.rangeEnd) || !this.ip4CIDRContains(form.spec.cidr, r.rangeStart))) {
      errors.push('IP Ranges 中，存在IP地址不在子网范围内的记录');
    } else {
      form.spec.ranges.forEach((r) => {
        if (this.comapreIP4(r.rangeStart, r.rangeEnd) > 0) {
          errors.push(`开始地址(${ r.rangeStart })不能大于结束地址(${ r.rangeEnd })`);
        }
      });
    }

    if (form.spec.routes.some((r) => r.dst === '')) {
      errors.push('自定义路由中，存在Destination为空的记录');
    }
    if (form.spec.routes.some((r) => r.dst !== '' && !cidrIPV4RegExp.test(r.dst))) {
      errors.push('自定义路由中，存在Destination格式错误的记录');
    }
    if (form.spec.routes.some((r) => r.gw !== '' && !ipv4RegExp.test(r.gw))) {
      errors.push('自定义路由中，存在Gateway格式错误的记录');
    }
    if (errors.length > 0) {
      set(this, 'errors', errors);

      return false;
    }
    set(this, 'errors', null);

    return true;
  },
  hasIpConflict() {
    const ipRanges = get(this, 'form.spec.ranges') || [];
    const ipRangesExisted = get(this, 'ipRangesExisted') || [];
    const targetIpRanges = ipRangesExisted.filter((r) => r.spec.ranges).reduce((t, c) => {
      t.push(...c.spec.ranges);

      return t;
    }, []);

    return ipRanges.some((r) => targetIpRanges.some((tr) => this.comapreIP4(r.rangeStart, tr.rangeStart) >= 0 && this.comapreIP4(r.rangeStart, tr.rangeEnd) <= 0)
      || targetIpRanges.some((tr) => this.comapreIP4(r.rangeEnd, tr.rangeStart) >= 0 && this.comapreIP4(r.rangeEnd, tr.rangeEnd) <= 0)
      || targetIpRanges.some((tr) => this.comapreIP4(r.rangeStart, tr.rangeStart) < 0 && this.comapreIP4(r.rangeEnd, tr.rangeEnd) > 0));
  },
  ip4CIDRContains(cidr, ip) {
    let result = false;

    try {
      const matcher = new CIDRMatcher([cidr]);

      result = matcher.contains(ip);
    } catch (err) {
      result = false;
    }


    return result;
  },
  comapreIP4(ipBegin, ipEnd) {
    const begin = ipBegin.split('.');
    const end = ipEnd.split('.');

    for (let i = 0;i < 4;i++) {
      if (parseInt(begin[i], 10) > parseInt(end[i], 10)) {
        return 1;
      } else if (parseInt(begin[i], 10) < parseInt(end[i], 10)) {
        return -1;
      }
    }

    return 0;
  },
  hasDuplicateValues(cidr) {
    const values = get(this, 'ipRangesExisted') || [];

    return values.some((item) => item.spec.cidr === cidr);
  }
});
