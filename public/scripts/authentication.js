import { authentication, userDatabase } from './utilities/database_handler.js';

const DISPLAY_SHOW = 'block';
const DISPLAY_HIDE = 'none';

const register = (values) => {
  const { email, password } = values;
  authentication.register({ email, password }).then(async () => {
    values['email'] = values['password'] = undefined;
    await userDatabase.createUser(authentication.getId(), values);
    alert('Register successful');
  }).catch((error) => {
    alert(error.toString());
  });
};

const login = async (values) => {
  await authentication.login(values).then(() => {
    alert('Login successful');
  }).catch((error) => {
    alert(error.toString());
  });
};

class Form {
  constructor(name, inputs, action) {
    this.name = name;
    this.inputs = inputs;
    this.action = action;
  }

  async send() {
    const values = {};
    for (const [name, id] of Object.entries(this.inputs)) {
      const element = document.getElementById(id);
      if (!element.checkValidity()) {
        element.focus();
        throw Error('Please check the data');
      }
      values[name] = element.value;
    }
    await this.action(values);
  }
}

const forms = [
  new Form(
    'login',
    {
      'email': 'email-login',
      'password': 'password-login'
    },
    login
  ),
  new Form(
    'register',
    {
      'email': 'email-register',
      'password': 'password-register',
      'nickname': 'nickname',
      'biography': 'biography',
      'dateOfBirth': 'date-of-birth'
    },
    register
  )
];

class FormHandler {
  constructor() {
    this.currentForm = forms[0];
    this.buttons = forms.map(({ name }) => document.getElementById(name));
    this.formElements = forms.map(({ name }) => {
      const id = `${name}-form`;
      return document.getElementById(id);
    });
  }

  enable() {
    const onClick = (_, index) => {
      if (this.currentForm !== forms[index]) {
        this.formElements[index].style.display = DISPLAY_SHOW;
        const active = this.formElements[index === 0 ? 1 : 0];
        active.style.display = DISPLAY_HIDE;
        this.currentForm = forms[index];
      } else {
        this.currentForm.send().then();
      }
    };
    this.buttons.forEach((button, index) => {
      button.onclick = () => onClick(button, index);
    });
  }
}

window.onload = () => {
  const forms = new FormHandler();
  forms.enable();
};
