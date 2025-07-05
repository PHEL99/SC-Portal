// Check authentication on page load
window.addEventListener('DOMContentLoaded', async function() {
    try {
        // Use a protected endpoint to check session
        const response = await fetch('/get-classes');
        if (response.status === 401) {
            window.location.href = '/';
        }
    } catch (err) {
        window.location.href = '/';
    }
});

document.getElementById('logoutBtn').addEventListener('click', async function() {
    try {
        const response = await fetch('/logout', { method: 'POST' });
        if (response.ok) {
            window.location.href = '/';
        } else {
            alert('Logout failed.');
        }
    } catch (err) {
        alert('Network error.');
    }
}); 