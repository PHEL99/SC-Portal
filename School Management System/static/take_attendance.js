window.addEventListener('DOMContentLoaded', async function() {
    const classSelect = document.getElementById('attendance_class');
    const studentsListContainer = document.getElementById('students-list-container');
    const attendanceForm = document.getElementById('attendanceForm');
    const submitBtn = document.getElementById('submitAttendanceBtn');
    const messageDiv = document.getElementById('attendance-message');
    let students = [];

    // Populate class dropdown
    try {
        const response = await fetch('/get-classes');
        const data = await response.json();
        if (response.ok && data.classes && data.classes.length > 0) {
            data.classes.forEach(className => {
                const option = document.createElement('option');
                option.value = className;
                option.textContent = className;
                classSelect.appendChild(option);
            });
        }
    } catch (err) {
        messageDiv.textContent = 'Failed to load classes.';
        messageDiv.style.color = 'red';
    }

    classSelect.addEventListener('change', async function() {
        studentsListContainer.innerHTML = '';
        messageDiv.textContent = '';
        submitBtn.style.display = 'none';
        if (!classSelect.value) return;
        try {
            const resp = await fetch(`/students-in-class?class_name=${encodeURIComponent(classSelect.value)}`);
            const data = await resp.json();
            if (resp.ok && data.students && data.students.length > 0) {
                students = data.students;
                let html = `<div style='margin-bottom:1rem;'><strong>Mark absent students:</strong></div>`;
                html += `<div class='attendance-students-list'>`;
                data.students.forEach(student => {
                    html += `<label class='attendance-checkbox'><input type='checkbox' name='absent_students' value='${student.student_id}'> ${student.name} (${student.student_id})</label><br>`;
                });
                html += `</div>`;
                studentsListContainer.innerHTML = html;
                submitBtn.style.display = '';
            } else {
                studentsListContainer.innerHTML = `<div class='form-message'>No students found in this class.</div>`;
            }
        } catch (err) {
            studentsListContainer.innerHTML = `<div class='form-message'>Failed to fetch students.</div>`;
        }
    });

    attendanceForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        messageDiv.textContent = '';
        submitBtn.disabled = true;
        const class_name = classSelect.value;
        const absent_students = Array.from(document.querySelectorAll('input[name="absent_students"]:checked')).map(cb => cb.value);
        try {
            const response = await fetch('/take-attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ class_name, absent_students }),
            });
            const data = await response.json();
            if (response.ok) {
                messageDiv.textContent = data.message || 'Attendance recorded!';
                messageDiv.style.color = 'green';
                studentsListContainer.innerHTML = '';
                classSelect.value = '';
                submitBtn.style.display = 'none';
            } else {
                let msg = data.detail || data.error || 'Failed to record attendance.';
                if (Array.isArray(msg)) {
                    msg = msg.map(item => typeof item === 'object' ? (item.message || item.detail || JSON.stringify(item)) : String(item)).join(', ');
                } else if (typeof msg === 'object') {
                    msg = msg.message || msg.detail || JSON.stringify(msg);
                }
                messageDiv.textContent = msg;
                messageDiv.style.color = 'red';
            }
        } catch (err) {
            messageDiv.textContent = 'Network error.';
            messageDiv.style.color = 'red';
        }
        submitBtn.disabled = false;
    });
}); 