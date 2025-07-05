document.getElementById('fetchTeacherForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const teacher_id = document.getElementById('update_teacher_id').value;
    const fetchMsg = document.getElementById('fetch-teacher-message');
    const updateForm = document.getElementById('updateTeacherForm');
    fetchMsg.textContent = '';
    updateForm.style.display = 'none';
    try {
        const response = await fetch(`/search-teacher?query=${encodeURIComponent(teacher_id)}`);
        const data = await response.json();
        if (response.ok && data.teacher && data.teacher.length > 0) {
            const teacher = data.teacher[0];
            document.getElementById('update_name').value = teacher.name || '';
            document.getElementById('update_subject').value = teacher.subject || '';
            document.getElementById('update_classes').value = teacher.classes || '';
            document.getElementById('update_contact').value = teacher.contact || '';
            updateForm.style.display = '';
            updateForm.dataset.teacherId = teacher_id;
        } else {
            fetchMsg.textContent = 'Teacher not found.';
            fetchMsg.style.color = 'red';
        }
    } catch (err) {
        fetchMsg.textContent = 'Network error.';
        fetchMsg.style.color = 'red';
    }
});

document.getElementById('updateTeacherForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const teacher_id = document.getElementById('updateTeacherForm').dataset.teacherId;
    const name = document.getElementById('update_name').value;
    const subject = document.getElementById('update_subject').value;
    const classes = document.getElementById('update_classes').value;
    const contact = document.getElementById('update_contact').value;
    const updateMsg = document.getElementById('update-teacher-message');
    updateMsg.textContent = '';
    try {
        const response = await fetch(`/update-teacher/${encodeURIComponent(teacher_id)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, subject, classes, contact }),
        });
        const data = await response.json();
        if (response.ok) {
            updateMsg.textContent = data.message || 'Teacher updated successfully!';
            updateMsg.style.color = 'green';
        } else {
            updateMsg.textContent = data.detail || data.error || 'Failed to update teacher.';
            updateMsg.style.color = 'red';
        }
    } catch (err) {
        updateMsg.textContent = 'Network error.';
        updateMsg.style.color = 'red';
    }
}); 