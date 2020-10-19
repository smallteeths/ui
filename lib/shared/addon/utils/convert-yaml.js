import json2yaml from 'json2yaml';
import dotObject from 'dot-object';

export default function convertDotAnswersToYaml(answers) {
  const obj = {};

  Object.keys(answers).forEach((key) => {
    const value = answers[key];

    key = key.replace(/\]\[/g, '.').replace(/\]\./g, '.')
      .replace(/\[/g, '.');

    if ( key.startsWith('.') ) {
      key = key.substr(1, key.length);
    }

    if ( key.endsWith(']') ) {
      key = key.substr(0, key.length - 1);
    }
    dotObject.str(key, value, obj);
  });

  return json2yaml.stringify(obj);
}

export function convertDotAnswersToBoolYaml(answers) {
  const obj = {};

  Object.keys(answers).forEach((key) => {
    let value = answers[key];

    key = key.replace(/\]\[/g, '.').replace(/\]\./g, '.')
      .replace(/\[/g, '.');

    if ( key.startsWith('.') ) {
      key = key.substr(1, key.length);
    }

    if ( key.endsWith(']') ) {
      key = key.substr(0, key.length - 1);
    }

    if (value === 'true') {
      value = true
    }

    if (value === 'false') {
      value = false
    }

    dotObject.str(key, value, obj);
  });

  return json2yaml.stringify(obj);
}
