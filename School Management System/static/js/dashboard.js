document.addEventListener('DOMContentLoaded', function() {
    // Handle logout
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', async function() {
        try {
            const response = await fetch('/logout', {
                method: 'POST'
            });
            if (response.ok) {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Logout failed:', error);
        }
    });

    // Fetch statistics
    async function fetchStatistics() {
        try {
            // Fetch students count
            const studentsResponse = await fetch('/get-students');
            const studentsData = await studentsResponse.json();
            document.getElementById('studentCount').textContent = studentsData.students.length;

            // Fetch teachers count
            const teachersResponse = await fetch('/get-teachers');
            const teachersData = await teachersResponse.json();
            document.getElementById('teacherCount').textContent = teachersData.teachers.length;

            // Fetch classes count
            const classesResponse = await fetch('/get-classes');
            const classesData = await classesResponse.json();
            document.getElementById('classCount').textContent = classesData.classes.length;
        } catch (error) {
            console.error('Error fetching statistics:', error);
        }
    }

    // Initial fetch of statistics
    fetchStatistics();

    // Add hover effects for admin cards
    const adminCards = document.querySelectorAll('.admin-card');
    adminCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}); 