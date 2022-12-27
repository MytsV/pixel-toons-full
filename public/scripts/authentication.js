import { authentication } from './utilities/database_handler.js';

const DISPLAY_SHOW = 'block';
const DISPLAY_HIDE = 'none';

const register = async () => {
  const emailElement = document.getElementById('email-register');
  const passwordElement = document.getElementById('password-register');
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

const modes = [
  'login',
  'register'
];

class AuthenticationForms {
  constructor() {
    this.currentMode = modes[0];
    this.buttons = modes.map((mode) => document.getElementById(mode));
    this.forms = modes.map((mode) => document.getElementById(`${mode}-form`));
  }

  enable() {
    this.buttons.forEach((button, index) => {
      button.onclick = () => {
        if (this.currentMode !== button.id) {
          this.forms[index].style.display = DISPLAY_SHOW;
          const active = this.forms.find((form) => form !== this.forms[index]);
          active.style.display = DISPLAY_HIDE;
          this.currentMode = button.id;
        } else if (this.currentMode === 'register') {
          register();
        } else {
          login();
        }
      };
    });
  }
}

window.onload = () => {
  const forms = new AuthenticationForms();
  forms.enable();
};
