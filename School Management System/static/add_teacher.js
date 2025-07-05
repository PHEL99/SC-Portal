document.getElementById('addTeacherForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const teacher_id = document.getElementById('teacher_id').value;
    const name = document.getElementById('name').value;
    const subject = document.getElementById('subject').value;
    const classes = document.getElementById('classes').value;
    const contact = document.getElementById('contact').value;
    const messageDiv = document.getElementById('add-teacher-message');
    messageDiv.textContent = '';
    try {
        const response = await fetch('/add_teacher', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ teacher_id, name, subject, classes, contact }),
        });
        const data = await response.json();
        if (response.ok) {
            messageDiv.textContent = data.message || 'Teacher added successfully!';
            messageDiv.style.color = 'green';
            document.getElementById('addTeacherForm').reset();
        } else {
            messageDiv.textContent = data.detail || data.error || 'Failed to add teacher.';
            messageDiv.style.color = 'red';
        }
    } catch (err) {
        messageDiv.textContent = 'Network error.';
        messageDiv.style.color = 'red';
    }
}); 