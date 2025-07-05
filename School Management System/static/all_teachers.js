let teachersData = [];
let sortState = {
    column: null,
    ascending: true
};

function renderTable(teachers) {
    const tableBody = document.querySelector('#teachers-table tbody');
    tableBody.innerHTML = '';
    teachers.forEach(teacher => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${teacher.teacher_id}</td>
            <td>${teacher.name}</td>
            <td>${teacher.subject}</td>
            <td>${teacher.classes || ''}</td>
            <td>${teacher.contact}</td>
        `;
        tableBody.appendChild(row);
    });
}

function sortAndRender(column) {
    if (sortState.column === column) {
        sortState.ascending = !sortState.ascending;
    } else {
        sortState.column = column;
        sortState.ascending = true;
    }
    teachersData.sort((a, b) => {
        let valA = a[column] ? a[column].toUpperCase() : '';
        let valB = b[column] ? b[column].toUpperCase() : '';
        if (valA < valB) return sortState.ascending ? -1 : 1;
        if (valA > valB) return sortState.ascending ? 1 : -1;
        return 0;
    });
    renderTable(teachersData);
}

window.addEventListener('DOMContentLoaded', async function() {
    const messageDiv = document.getElementById('teachers-message');
    messageDiv.textContent = '';
    try {
        const response = await fetch('/get-teachers');
        const data = await response.json();
        if (response.ok && data.teachers && data.teachers.length > 0) {
            teachersData = data.teachers;
            renderTable(teachersData);
        } else {
            messageDiv.textContent = 'No teachers found.';
        }
    } catch (err) {
        messageDiv.textContent = 'Failed to fetch teachers.';
    }

    // Add sorting event listener for Teacher ID
    document.querySelector('#teachers-table th:nth-child(1)').addEventListener('click', function() {
        sortAndRender('teacher_id');
    });
}); 