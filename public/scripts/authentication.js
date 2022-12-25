const publicKey = 'AIzaSyAncVp4HixyOKA3uLWD4fR4MZI37ScTX8g';

const register = async () => {
  const emailElement = document.getElementById('email');
  const passwordElement = document.getElementById('password');
  const email = emailElement.value;
  const password = passwordElement.value;
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${publicKey}&email=${email}&password=${password}`, {
    'method': 'POST',
  });
  console.log(await response.text());
};

const login = async () => {
  const emailElement = document.getElementById('email');
  const passwordElement = document.getElementById('password');
  const email = emailElement.value;
  const password = passwordElement.value;
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${publicKey}&email=${email}&password=${password}`, {
    'method': 'POST',
  });
  console.log(await response.text());
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
