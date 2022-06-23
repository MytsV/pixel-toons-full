const PUBLIC_KEY = 'AIzaSyAncVp4HixyOKA3uLWD4fR4MZI37ScTX8g';
const URL_START = 'https://identitytoolkit.googleapis.com/v1/';
const DEFAULT_INIT = { 'method': 'POST' };
const ID_KEY = 'userId';

class Authentication {
  async register(email, password, userData) {
    const params = Object.assign({}, { email, password }, userData);
    const response = await requestData('accounts:signUp', params);
    if (!response.ok) throw Error(response.status.toString());
    await Authentication.#setCookies(response);
  }

  async login(email, password) {
    const params = Object.assign({}, { email, password });
    const response = await requestData('accounts:signInWithPassword', params);
    if (!response.ok) throw Error(response.status.toString());
    await Authentication.#setCookies(response);
  }

  getId() {
    return window.localStorage.getItem(ID_KEY)
  }

  static async #setCookies(response) {
    const data = await response.json();
    console.log(data['idToken']);
    window.localStorage.setItem(ID_KEY, data['idToken']);
  }
}

export const authentication = new Authentication();

async function requestData(route, params) {
  params['key'] = PUBLIC_KEY;
  const url = URL_START + route + toUrlString(params);
  return fetch(url, DEFAULT_INIT);
}

function toUrlString(params) {
  let string = '?';
  for (const [key, value] of Object.entries(params)) {
    string += `${key}=${value}&`;
  }
  return string;
}
