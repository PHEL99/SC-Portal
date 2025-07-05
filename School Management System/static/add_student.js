document.getElementById('addStudentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const student_id = document.getElementById('student_id').value;
    const name = document.getElementById('name').value;
    const class_name = document.getElementById('class_name').value;
    const contact = document.getElementById('contact').value;
    const grade = document.getElementById('grade').value;
    const messageDiv = document.getElementById('add-student-message');
    messageDiv.textContent = '';
    try {
        const response = await fetch('/add_student', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ student_id, name, class_name, contact, grade }),
        });
        const data = await response.json();
        if (response.ok) {
            messageDiv.textContent = data.message || 'Student added successfully!';
            messageDiv.style.color = 'green';
            document.getElementById('addStudentForm').reset();
        } else {
            messageDiv.textContent = data.detail || data.error || 'Failed to add student.';
            messageDiv.style.color = 'red';
        }
    } catch (err) {
        messageDiv.textContent = 'Network error.';
        messageDiv.style.color = 'red';
    }
}); 