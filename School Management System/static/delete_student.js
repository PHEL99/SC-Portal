document.getElementById('deleteStudentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    let student_id = document.getElementById('delete_student_id').value;
    student_id = student_id.trim().toUpperCase();
    const messageDiv = document.getElementById('delete-student-message');
    messageDiv.textContent = '';
    try {
        const response = await fetch(`/delete-student/${encodeURIComponent(student_id)}`, {
            method: 'DELETE',
        });
        const data = await response.json();
        if (response.ok) {
            messageDiv.textContent = data.message || 'Student deleted successfully!';
            messageDiv.style.color = 'green';
            document.getElementById('deleteStudentForm').reset();
        } else {
            let msg = data.detail || data.error || 'Failed to delete student.';
            if (msg.toLowerCase().includes('not found')) {
                msg = 'Student does not exist.';
            }
            messageDiv.textContent = msg;
            messageDiv.style.color = 'red';
        }
    } catch (err) {
        messageDiv.textContent = 'Network error.';
        messageDiv.style.color = 'red';
    }
}); 