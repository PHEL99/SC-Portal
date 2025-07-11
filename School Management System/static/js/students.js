// Global variables
let currentStudentId = null;
let students = [];
let classes = [];

// DOM Elements
const modal = document.getElementById('studentModal');
const modalTitle = document.getElementById('modalTitle');
const studentForm = document.getElementById('studentForm');
const searchInput = document.getElementById('searchInput');
const studentsTableBody = document.getElementById('studentsTableBody');
const logoutBtn = document.getElementById('logoutBtn');

// Event Listeners
document.addEventListener('DOMContentLoaded', initialize);
studentForm.addEventListener('submit', handleSubmit);
searchInput.addEventListener('input', handleSearch);
logoutBtn.addEventListener('click', handleLogout);

// Initialize the page
async function initialize() {
    await Promise.all([
        loadClasses(),
        loadStudents()
    ]);
    setupSorting();
}

// Load classes for the dropdown
async function loadClasses() {
    try {
        const response = await fetch('/get-classes');
        const data = await response.json();
        classes = data.classes;
        
        const classSelect = document.getElementById('className');
        classSelect.innerHTML = '<option value="">Select Class</option>' +
            classes.map(className => 
                `<option value="${className}">${className}</option>`
            ).join('');
    } catch (error) {
        console.error('Error loading classes:', error);
        alert('Failed to load classes. Please try again.');
    }
}

// Load and display students
async function loadStudents() {
    try {
        const response = await fetch('/get-students');
        const data = await response.json();
        students = data.students;
        displayStudents(students);
    } catch (error) {
        console.error('Error loading students:', error);
        alert('Failed to load students. Please try again.');
    }
}

// Display students in the table
function displayStudents(studentsToDisplay) {
    const tableBody = document.getElementById('studentsTableBody');
    tableBody.innerHTML = '';

    studentsToDisplay.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="Student ID">${student.student_id}</td>
            <td data-label="Name">${student.name}</td>
            <td data-label="Class">${student.class_name}</td>
            <td data-label="Contact">${student.contact}</td>
            <td data-label="Actions">
                <div class="action-buttons">
                    <button class="edit-btn" onclick="editStudent('${student.student_id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="deleteStudent('${student.student_id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Modal functions
function openModal(studentId = null) {
    currentStudentId = studentId;
    modal.classList.add('show');
    
    if (studentId) {
        modalTitle.textContent = 'Edit Student';
        const student = students.find(s => s.student_id === studentId);
        if (student) {
            document.getElementById('studentId').value = student.student_id;
            document.getElementById('studentId').disabled = true;
            document.getElementById('studentName').value = student.name;
            document.getElementById('className').value = student.class_name;
            document.getElementById('contact').value = student.contact;
        }
    } else {
        modalTitle.textContent = 'Add New Student';
        studentForm.reset();
        document.getElementById('studentId').disabled = false;
    }
}

function closeModal() {
    modal.classList.remove('show');
    studentForm.reset();
    currentStudentId = null;
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();
    
    const formData = {
        student_id: document.getElementById('studentId').value.toUpperCase(),
        name: document.getElementById('studentName').value,
        class_name: document.getElementById('className').value,
        contact: document.getElementById('contact').value
    };

    try {
        let response;
        if (currentStudentId) {
            // Update existing student
            response = await fetch(`/update-student/${currentStudentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
        } else {
            // Add new student
            response = await fetch('/add_student', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
        }

        const data = await response.json();
        
        if (response.ok) {
            await loadStudents();
            closeModal();
            alert(data.message);
        } else {
            alert(data.detail || data.error || 'An error occurred');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
}

// Delete student
async function deleteStudent(studentId) {
    if (!confirm('Are you sure you want to delete this student?')) {
        return;
    }

    try {
        const response = await fetch(`/delete-student/${studentId}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        
        if (response.ok) {
            await loadStudents();
            alert(data.message);
        } else {
            alert(data.detail || 'Failed to delete student');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to delete student. Please try again.');
    }
}

// Edit student
function editStudent(studentId) {
    openModal(studentId);
}

// Search functionality
async function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredStudents = students.filter(student =>
        student.student_id.toLowerCase().includes(searchTerm) ||
        student.name.toLowerCase().includes(searchTerm)
    );
    displayStudents(filteredStudents);
}

// Sorting functionality
function setupSorting() {
    const sortableHeaders = document.querySelectorAll('th.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            sortStudents(column);
        });
    });
}

function sortStudents(column) {
    const sortIcon = document.querySelector(`th[data-sort="${column}"] i`);
    const isAscending = sortIcon.classList.contains('fa-sort') || sortIcon.classList.contains('fa-sort-down');

    // Update sort icons
    document.querySelectorAll('th.sortable i').forEach(icon => {
        icon.className = 'fas fa-sort';
    });
    sortIcon.className = `fas fa-sort-${isAscending ? 'up' : 'down'}`;

    // Sort the students array
    students.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];
        
        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }
        
        if (valA < valB) return isAscending ? -1 : 1;
        if (valA > valB) return isAscending ? 1 : -1;
        return 0;
    });

    displayStudents(students);
}

// Logout functionality
async function handleLogout() {
    try {
        const response = await fetch('/logout', { method: 'POST' });
        if (response.ok) {
            window.location.href = '/static/html/login.html';
        } else {
            throw new Error('Logout failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to logout. Please try again.');
    }
} 