document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorMsg = document.getElementById('error-msg');

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (res.ok) {
      window.location.href = 'admin.html';
    } else {
      const data = await res.json();
      errorMsg.textContent = data.error || 'Login failed';
      errorMsg.classList.remove('hidden');
    }
  } catch (error) {
    errorMsg.textContent = 'Network error';
    errorMsg.classList.remove('hidden');
  }
});

const toggleForgot = document.getElementById('toggle-forgot');
const forgotForm = document.getElementById('forgot-form');
const forgotMsg = document.getElementById('forgot-msg');

toggleForgot.addEventListener('click', (e) => {
  e.preventDefault();
  forgotForm.classList.toggle('hidden');
  forgotMsg.classList.add('hidden');
});

forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('forgot-username').value;
  const securityPin = document.getElementById('forgot-pin').value;
  const newPassword = document.getElementById('forgot-new-password').value;

  try {
    const res = await fetch('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, securityPin, newPassword })
    });

    const data = await res.json();
    if (res.ok) {
      forgotMsg.textContent = 'Password reset successfully! You can now login.';
      forgotMsg.style.color = 'var(--success)';
      forgotMsg.style.backgroundColor = 'var(--success-bg)';
      forgotMsg.classList.remove('hidden');
      forgotForm.reset();

      setTimeout(() => {
        forgotForm.classList.add('hidden');
        forgotMsg.classList.add('hidden');
        forgotMsg.style.color = '';
        forgotMsg.style.backgroundColor = '';
      }, 3000);
    } else {
      forgotMsg.textContent = data.error || 'Reset failed';
      forgotMsg.style.color = 'var(--danger)';
      forgotMsg.style.backgroundColor = 'var(--danger-bg)';
      forgotMsg.classList.remove('hidden');
    }
  } catch (error) {
    forgotMsg.textContent = 'Network error';
    forgotMsg.style.color = 'var(--danger)';
    forgotMsg.style.backgroundColor = 'var(--danger-bg)';
    forgotMsg.classList.remove('hidden');
  }
});