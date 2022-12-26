import { authentication } from './utilities/database_handler.js';

const publicKey = 'AIzaSyAncVp4HixyOKA3uLWD4fR4MZI37ScTX8g';

const getAccount = async () => {
  const id = authentication.getId();
  if (!id) {
    throw Error('Not signed in!');
  } else {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${publicKey}&idToken=${id}`, {
      'method': 'POST',
    });
    const data = await response.json();
    const userData = data['users'][0];
    const emailElement = document.getElementById('email');
    emailElement.innerText = userData['email'];
  }
};

window.onload = () => {
  getAccount();
};
