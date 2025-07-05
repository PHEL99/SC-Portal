document.getElementById('searchTeacherForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const query = document.getElementById('search_query').value;
    const messageDiv = document.getElementById('search-teacher-message');
    const resultDiv = document.getElementById('search-teacher-result');
    messageDiv.textContent = '';
    resultDiv.innerHTML = '';
    try {
        const response = await fetch(`/search-teacher?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (response.ok && data.teacher && data.teacher.length > 0) {
            const teacher = data.teacher[0];
            resultDiv.innerHTML = `
                <div style="background:#f8f9fa;padding:1.2rem 1.5rem;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.07);">
                    <strong>Teacher ID:</strong> ${teacher.teacher_id}<br>
                    <strong>Name:</strong> ${teacher.name}<br>
                    <strong>Subject:</strong> ${teacher.subject}<br>
                    <strong>Classes:</strong> ${teacher.classes || ''}<br>
                    <strong>Contact:</strong> ${teacher.contact}
                </div>
            `;
        } else {
            messageDiv.textContent = 'Teacher not found.';
            messageDiv.style.color = 'red';
        }
    } catch (err) {
        messageDiv.textContent = 'Network error.';
        messageDiv.style.color = 'red';
    }
}); 