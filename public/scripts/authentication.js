import { authentication } from './utilities/database_handler.js';

let mode = 'login';
const DISPLAY_SHOW = 'block';
const DISPLAY_HIDE = 'none';

const register = async () => {
  const emailElement = document.getElementById('email-registration');
  const passwordElement = document.getElementById('password-registration');
  const email = emailElement.value;
  const password = passwordElement.value;
  authentication.register(email, password, {}).then(() => {
    alert('Register successful');
  }).catch((error) => {
    alert(error.toString());
  });
};

const login = async () => {
  const emailElement = document.getElementById('email-login');
  const passwordElement = document.getElementById('password-login');
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
    if (mode === 'register') {
      register();
    } else {
      const registerForm = document.getElementById('registration-form');
      registerForm.style.display = DISPLAY_SHOW;
      const loginForm = document.getElementById('login-form');
      loginForm.style.display = DISPLAY_HIDE;
      mode = 'register';
    }
  };
  const loginButton = document.getElementById('login');
  loginButton.onclick = () => {
    if (mode === 'login') {
      login();
    } else {
      const loginForm = document.getElementById('login-form');
      loginForm.style.display = DISPLAY_SHOW;
      const registrationForm = document.getElementById('registration-form');
      registrationForm.style.display = DISPLAY_HIDE;
      mode = 'login';
    }
  };
};
