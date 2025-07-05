document.getElementById('addClassForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const class_name = document.getElementById('class_name').value;
    const messageDiv = document.getElementById('add-class-message');
    messageDiv.textContent = '';
    try {
        const response = await fetch(`/add-class?name=${encodeURIComponent(class_name)}`, {
            method: 'POST'
        });
        const data = await response.json();
        if (response.ok) {
            messageDiv.textContent = data.message || 'Class added successfully!';
            messageDiv.style.color = 'green';
            document.getElementById('addClassForm').reset();
        } else {
            messageDiv.textContent = data.detail || data.error || 'Failed to add class.';
            messageDiv.style.color = 'red';
        }
    } catch (err) {
        messageDiv.textContent = 'Network error.';
        messageDiv.style.color = 'red';
    }
}); 