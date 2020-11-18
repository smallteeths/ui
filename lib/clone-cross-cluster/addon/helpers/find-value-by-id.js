import Helper from '@ember/component/helper';

export default Helper.extend({
  compute(params) {
    console.log(params);
    const v = params[0];
    const k = params[1];
    const a = params.slice(2).reduce((t, c) => {
      t.push(...c);

      return t;
    }, []).find((item) => item.id === v);

    return a ? a[k] : '';
  }
});