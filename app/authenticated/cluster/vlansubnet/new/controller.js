import { inject as service } from '@ember/service';
import { get, set, computed } from '@ember/object';
import Controller from '@ember/controller';
import CIDRMatcher from 'cidr-matcher';
import { debouncedObserver } from 'ui/utils/debounce';

const ipv4RegExp = /^(((\d{1,2})|(1\d{2})|(2[0-4]\d)|(25[0-5]))\.){3}((\d{1,2})|(1\d{2})|(2[0-4]\d)|(25[0-5]))$/;

export default Controller.extend({
  vlansubnet:      service(),
  scope:           service(),
  intl:            service(),
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
      form.spec.ipDelayReuse = (parseInt(form.spec.ipDelayReuse, 10) || 0) * 60;

      const clusterId = get(this, 'model.clusterId');
      const {
        master,
        vlan,
        cidr,
        ranges,
        podDefaultGateway
      } = form.spec;

      (!get(this, 'hasDefaultGateway') || !podDefaultGateway.enable) && (form.spec.podDefaultGateway = {});
      this.hasVlan(master || '', vlan || 0).then(() => {
        const intl = get(this, 'intl');
        // if (result) {
        //   set(this, 'errors', [`master为${ master }且vlan为${ vlan || '空' }, 已经存在`]);
        //   cb(false);

        //   return;
        // }
        if (this.hasIpConflict()) {
          set(this, 'errors', [intl.t('formVlan.ipRange.IPRangeExistWithOthers')]);
          cb(false);

          return;
        }

        if ((!ranges || ranges.length === 0) && this.hasDuplicateValues(cidr)) {
          set(this, 'errors', [intl.t('formVlan.ipRange.formInfoExist', {
            master,
            vlan,
            cidr
          })]);
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

      r.iface = get(this, 'ifaceChoice')[0].value;

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
  hasDefaultGateway: computed('scope.currentCluster.rancherKubernetesEngineConfig.network.plugin', 'scope.currentCluster.rancherKubernetesEngineConfig.network.options', function() {
    let network = get(this, 'scope.currentCluster.rancherKubernetesEngineConfig.network');

    if (!network){
      return false;
    }
    if (network.plugin === 'none'){
      let options = network.options;

      return options && (options.pandariaExtraPluginName === 'multus-flannel-macvlan' || options.pandariaExtraPluginName === 'multus-canal-macvlan');
    } else {
      return (network.plugin === 'multus-flannel-macvlan' || network.plugin === 'multus-canal-macvlan');
    }
  }),
  isCanalMacvlan: computed('scope.currentCluster.rancherKubernetesEngineConfig.network.plugin', 'scope.currentCluster.rancherKubernetesEngineConfig.network.options', function() {
    let network = get(this, 'scope.currentCluster.rancherKubernetesEngineConfig.network');

    if (!network){
      return false;
    }
    if (network.plugin === 'none'){
      let options = network.options;

      return options &&  options.pandariaExtraPluginName === 'multus-canal-macvlan';
    } else {
      return network.plugin === 'multus-canal-macvlan';
    }
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
    const intl = get(this, 'intl');

    if (form.metadata.name === '') {
      errors.push(intl.t('formVlan.name.nameReq'));
    }
    const nameReg = /^[a-z0-9A-Z][a-z0-9A-Z_.-]{0,60}[a-z0-9A-Z]$/;

    if (form.metadata.name !== '' && !nameReg.test(form.metadata.name)) {
      errors.push(intl.t('formVlan.name.nameFormatError'));
    }
    if (form.spec.master === '') {
      errors.push(intl.t('formVlan.master.masterReq'));
    }

    if (form.spec.vlan !== '' && (!/^\d+$/.test(form.spec.vlan) || form.spec.vlan < 2 || form.spec.vlan > 4095)) {
      errors.push(intl.t('formVlan.vlan.vlanRangeError'));
    }

    if (form.spec.cidr === '') {
      errors.push(intl.t('formVlan.cidr.cidrReq'));
    }
    const cidrIPV4RegExp = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/\d{1,2}$/;

    if (form.spec.cidr !== '' && !cidrIPV4RegExp.test(form.spec.cidr)) {
      errors.push(intl.t('formVlan.cidr.cidrFormatError'));
    }

    if (form.spec.gateway && !ipv4RegExp.test(form.spec.gateway)) {
      errors.push(intl.t('formVlan.gateway.gatewayFormatError'));
    }
    if (form.spec.podDefaultGateway.enable && !form.spec.podDefaultGateway.serviceCidr) {
      errors.push(intl.t('formVlan.defaultGateway.serviceCidr.serviceCidrReq'));
    }
    if (form.spec.podDefaultGateway.enable && form.spec.podDefaultGateway.serviceCidr && !cidrIPV4RegExp.test(form.spec.podDefaultGateway.serviceCidr)) {
      errors.push(intl.t('formVlan.defaultGateway.serviceCidr.serviceCidrFormatError'));
    }
    if (form.spec.ranges.some((r) => !ipv4RegExp.test(r.rangeEnd) || !ipv4RegExp.test(r.rangeStart))) {
      errors.push(intl.t('formVlan.ipRange.IPFormatError'));
    } else if (form.spec.ranges.some((r) => !this.ip4CIDRContains(form.spec.cidr, r.rangeEnd) || !this.ip4CIDRContains(form.spec.cidr, r.rangeStart))) {
      errors.push(intl.t('formVlan.ipRange.IPInCidrError'));
    } else {
      form.spec.ranges.forEach((r) => {
        if (this.comapreIP4(r.rangeStart, r.rangeEnd) > 0) {
          errors.push(intl.t('formVlan.ipRange.IPRangeError', {
            min: r.rangeStart,
            max: r.rangeEnd
          }));
        }
      });
    }

    if (form.spec.routes.some((r) => !r.dst)) {
      errors.push(intl.t('formVlan.route.routeDstReq'));
    }
    if (form.spec.routes.some((r) => !!r.dst && !cidrIPV4RegExp.test(r.dst))) {
      errors.push(intl.t('formVlan.route.routeDstFormatError'));
    }
    if (form.spec.routes.some((r) => !!r.gw && !ipv4RegExp.test(r.gw))) {
      errors.push(intl.t('formVlan.route.routeGwFormatError'));
    }
    if (form.spec.routes.some((r) => ((r.iface && r.iface !== 'eth0') || !r.iface) && !!r.gw && ipv4RegExp.test(r.gw) && !this.ip4CIDRContains(form.spec.cidr, r.gw))) {
      errors.push(intl.t('formVlan.route.routeGwInCidrError'));
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
