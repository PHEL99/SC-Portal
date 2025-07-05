// Redirect to dashboard if already logged in
window.addEventListener('DOMContentLoaded', async function() {
    try {
        const response = await fetch('/get-classes');
        if (response.ok) {
            window.location.href = '/static/dashboard.html';
        }
    } catch (err) {
        // Do nothing, stay on login page
    }
});

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = '';

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        });
        if (response.ok) {
            // Redirect or show success
            window.location.href = '/static/dashboard.html'; // Use static path
        } else {
            const data = await response.json();
            errorDiv.textContent = data.detail || 'Login failed';
        }
    } catch (err) {
        errorDiv.textContent = 'Network error';
    }
}); 