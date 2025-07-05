document.getElementById('searchStudentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const query = document.getElementById('search_query').value;
    const messageDiv = document.getElementById('search-student-message');
    const resultDiv = document.getElementById('search-student-result');
    messageDiv.textContent = '';
    resultDiv.innerHTML = '';
    try {
        const response = await fetch(`/search-student?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (response.ok && data.student && data.student.length > 0) {
            const student = data.student[0];
            resultDiv.innerHTML = `
                <div style="background:#f8f9fa;padding:1.2rem 1.5rem;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.07);">
                    <strong>Student ID:</strong> ${student.student_id}<br>
                    <strong>Name:</strong> ${student.name}<br>
                    <strong>Class Name:</strong> ${student.class_name}<br>
                    <strong>Contact:</strong> ${student.contact}<br>
                    <strong>Grade:</strong> ${student.grade || ''}
                </div>
            `;
        } else {
            messageDiv.textContent = 'Student not found.';
            messageDiv.style.color = 'red';
        }
    } catch (err) {
        messageDiv.textContent = 'Network error.';
        messageDiv.style.color = 'red';
    }
}); 