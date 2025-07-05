document.getElementById('deleteTeacherForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    let teacher_id = document.getElementById('delete_teacher_id').value;
    teacher_id = teacher_id.trim().toUpperCase();
    const messageDiv = document.getElementById('delete-teacher-message');
    messageDiv.textContent = '';
    try {
        const response = await fetch(`/delete-teacher/${encodeURIComponent(teacher_id)}`, {
            method: 'DELETE',
        });
        const data = await response.json();
        if (response.ok) {
            messageDiv.textContent = data.message || 'Teacher deleted successfully!';
            messageDiv.style.color = 'green';
            document.getElementById('deleteTeacherForm').reset();
        } else {
            let msg = data.detail || data.error || 'Failed to delete teacher.';
            if (msg.toLowerCase().includes('not found')) {
                msg = 'Teacher does not exist.';
            }
            messageDiv.textContent = msg;
            messageDiv.style.color = 'red';
        }
    } catch (err) {
        messageDiv.textContent = 'Network error.';
        messageDiv.style.color = 'red';
    }
}); 