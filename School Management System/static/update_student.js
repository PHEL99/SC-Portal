document.getElementById('fetchStudentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const student_id = document.getElementById('update_student_id').value;
    const fetchMsg = document.getElementById('fetch-student-message');
    const updateForm = document.getElementById('updateStudentForm');
    fetchMsg.textContent = '';
    updateForm.style.display = 'none';
    try {
        const response = await fetch(`/search-student?query=${encodeURIComponent(student_id)}`);
        const data = await response.json();
        if (response.ok && data.student && data.student.length > 0) {
            const student = data.student[0];
            document.getElementById('update_name').value = student.name || '';
            document.getElementById('update_class_name').value = student.class_name || '';
            document.getElementById('update_contact').value = student.contact || '';
            document.getElementById('update_grade').value = student.grade || '';
            updateForm.style.display = '';
            updateForm.dataset.studentId = student_id;
        } else {
            fetchMsg.textContent = 'Student not found.';
            fetchMsg.style.color = 'red';
        }
    } catch (err) {
        fetchMsg.textContent = 'Network error.';
        fetchMsg.style.color = 'red';
    }
});

document.getElementById('updateStudentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const student_id = document.getElementById('updateStudentForm').dataset.studentId;
    const name = document.getElementById('update_name').value;
    const class_name = document.getElementById('update_class_name').value;
    const contact = document.getElementById('update_contact').value;
    const grade = document.getElementById('update_grade').value;
    const updateMsg = document.getElementById('update-student-message');
    updateMsg.textContent = '';
    try {
        const response = await fetch(`/update-student/${encodeURIComponent(student_id)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, class_name, contact, grade }),
        });
        const data = await response.json();
        if (response.ok) {
            updateMsg.textContent = data.message || 'Student updated successfully!';
            updateMsg.style.color = 'green';
        } else {
            updateMsg.textContent = data.detail || data.error || 'Failed to update student.';
            updateMsg.style.color = 'red';
        }
    } catch (err) {
        updateMsg.textContent = 'Network error.';
        updateMsg.style.color = 'red';
    }
}); 