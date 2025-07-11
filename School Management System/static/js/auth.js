// Check if user is authenticated
async function checkAuth() {
    try {
        const response = await fetch('/check-auth');
        const isLoginPage = window.location.pathname.includes('login.html');
        
        if (response.ok) {
            // User is authenticated
            if (isLoginPage) {
                // Redirect to dashboard if trying to access login page while logged in
                window.location.href = '/static/html/dashboard.html';
            }
        } else {
            // User is not authenticated
            if (!isLoginPage) {
                // Redirect to login if trying to access any other page while logged out
                window.location.href = '/static/html/login.html';
            }
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = '/static/html/login.html';
        }
    }
}

// Run auth check when page loads
document.addEventListener('DOMContentLoaded', checkAuth); 