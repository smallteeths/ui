import Crypto from 'crypto-js'

function getSecret() {
  const CSRF = document.cookie.split(';').find((item) => item.indexOf('CSRF') > -1);

  if (CSRF === undefined) {
    console.error('cannot get CSRF');

    return ''
  } else {
    return CSRF.split('=')[1]
  }
}
/**
 * @param {String} message
 * @param {String} secret
 * @return {String}
 */
export default function AESEncrypt(message, secret = getSecret()) {
  if (message === '' || secret === '') {
    return message;
  }

  return Crypto.AES.encrypt(message, secret).toString()
}
