import { helper } from '@ember/component/helper';

export function getValue(params) {
  const [obj, key] = params

  if (obj && key) {
    return obj[key];
  }

  return null
}

export default helper(getValue);
