
import { convertToMillis } from 'shared/utils/util';
import { parseSi } from 'shared/utils/parse-unit';

export function convertToLimit(key, value) {
  if ( !value ) {
    return '';
  }

  switch (key) {
  case 'limitsCpu':
  case 'requestsCpu':
    return convertToMillis(value);
  case 'limitsMemory':
  case 'requestsMemory':
    return parseSi(value, 1024) / 1048576;
  case 'requestsStorage':
    return parseSi(value) / (1024 ** 3);
  default:
    return value;
  }
}

export function convertToString(key, value) {
  if ( !value ) {
    return '';
  }

  switch (key) {
  case 'limitsCpu':
  case 'requestsCpu':
    return `${ value }m`;
  case 'limitsMemory':
  case 'requestsMemory':
    return `${ value }Mi`;
  case 'requestsStorage':
    return `${ value }Gi`;
  default:
    return value;
  }
}

export function quotaWithUnits(label, value, readable = false) {
  let cpuNotation     = readable ? 'milli CPUs' : 'm';
  let memNotation     = readable ? 'MiB' : 'Mi';
  let storageNotation = readable ? 'GB' : 'Gi';

  if ( label === 'limitsCpu' || label === 'requestsCpu' ) {
    return `${ value }${ cpuNotation }`;
  } else if ( label === 'limitsMemory' || label === 'requestsMemory' ) {
    return `${ value }${ memNotation }`;
  } else if ( label === 'requestsStorage' ) {
    return `${ value }${ storageNotation }`;
  } else if ( label === 'requestsGpuMemory' ) {
    return `${ value } GiB`;
  } else {
    return value;
  }
}
