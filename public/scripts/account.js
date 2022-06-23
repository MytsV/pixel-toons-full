import { authentication, userDatabase } from './utilities/database_handler.js';

const getAccount = async () => {
  const id = authentication.getId();
  if (!id) {
    throw Error('Not signed in!');
  } else {
    const userData = await userDatabase.getUser(id);
    for (const [key, value] of Object.entries(userData)) {
      const element = document.getElementById(key);
      element.innerText = value;
    }
  }
};

window.onload = () => {
  getAccount();
};
