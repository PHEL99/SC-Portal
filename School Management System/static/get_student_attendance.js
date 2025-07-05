window.addEventListener('DOMContentLoaded', async function() {
    const classSelect = document.getElementById('attendance_class');
    const dateInput = document.getElementById('attendance_date');
    const attendanceForm = document.getElementById('getAttendanceForm');
    const messageDiv = document.getElementById('attendance-message');
    const recordsContainer = document.getElementById('attendance-records-container');

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

    attendanceForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        messageDiv.textContent = '';
        recordsContainer.innerHTML = '';
        const class_name = classSelect.value;
        const date = dateInput.value;
        if (!class_name || !date) {
            messageDiv.textContent = 'Please select a class and date.';
            messageDiv.style.color = 'red';
            return;
        }
        try {
            const response = await fetch(`/get-student-attendance?class_name=${encodeURIComponent(class_name)}&date=${encodeURIComponent(date)}`);
            const data = await response.json();
            if (response.ok && data.attendance_records && data.attendance_records.length > 0) {
                let html = `<h3>Attendance for ${class_name} on ${date}</h3>`;
                html += `<table class='students-in-class-table'><thead><tr><th>Student ID</th><th>Status</th></tr></thead><tbody>`;
                data.attendance_records.forEach(record => {
                    html += `<tr><td>${record.student_id}</td><td>${record.status}</td></tr>`;
                });
                html += '</tbody></table>';
                recordsContainer.innerHTML = html;
            } else {
                let msg = data.message || 'No attendance records found.';
                if (Array.isArray(msg)) {
                    msg = msg.join(', ');
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
    });
}); 