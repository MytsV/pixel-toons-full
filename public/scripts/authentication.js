import { authentication } from './utilities/database_handler.js';

const register = async () => {
  const emailElement = document.getElementById('email');
  const passwordElement = document.getElementById('password');
  const email = emailElement.value;
  const password = passwordElement.value;
  authentication.register(email, password, {}).then(() => {
    alert('Register successful');
  }).catch((error) => {
    alert(error.toString());
  });
};

const login = async () => {
  const emailElement = document.getElementById('email');
  const passwordElement = document.getElementById('password');
  const email = emailElement.value;
  const password = passwordElement.value;
  await authentication.login(email, password).then(() => {
    alert('Login successful');
  }).catch((error) => {
    alert(error.toString());
  });
};

window.onload = () => {
  const registerButton = document.getElementById('register');
  registerButton.onclick = () => {
    register();
  };
  const loginButton = document.getElementById('login');
  loginButton.onclick = () => {
    login();
  };
};
