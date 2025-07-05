let studentsData = [];
let sortState = {
    column: null,
    ascending: true
};

function renderTable(students) {
    const tableBody = document.querySelector('#students-table tbody');
    tableBody.innerHTML = '';
    students.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.student_id}</td>
            <td>${student.name}</td>
            <td>${student.class_name}</td>
            <td>${student.contact}</td>
            <td>${student.grade || ''}</td>
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
    studentsData.sort((a, b) => {
        let valA = a[column] ? a[column].toUpperCase() : '';
        let valB = b[column] ? b[column].toUpperCase() : '';
        if (valA < valB) return sortState.ascending ? -1 : 1;
        if (valA > valB) return sortState.ascending ? 1 : -1;
        return 0;
    });
    renderTable(studentsData);
}

window.addEventListener('DOMContentLoaded', async function() {
    const messageDiv = document.getElementById('students-message');
    messageDiv.textContent = '';
    try {
        const response = await fetch('/get-students');
        const data = await response.json();
        if (response.ok && data.students && data.students.length > 0) {
            studentsData = data.students;
            renderTable(studentsData);
        } else {
            messageDiv.textContent = 'No students found.';
        }
    } catch (err) {
        messageDiv.textContent = 'Failed to fetch students.';
    }

    // Add sorting event listeners
    document.querySelector('#students-table th:nth-child(1)').addEventListener('click', function() {
        sortAndRender('student_id');
    });
    document.querySelector('#students-table th:nth-child(3)').addEventListener('click', function() {
        sortAndRender('class_name');
    });
}); 