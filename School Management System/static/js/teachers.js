// Global variables
let currentTeacherId = null;
let teachers = [];
let classes = [];

// DOM Elements
const modal = document.getElementById('teacherModal');
const modalTitle = document.getElementById('modalTitle');
const teacherForm = document.getElementById('teacherForm');
const searchInput = document.getElementById('searchInput');
const teachersTableBody = document.getElementById('teachersTableBody');
const logoutBtn = document.getElementById('logoutBtn');
const classesContainer = document.getElementById('classesContainer');

// Event Listeners
document.addEventListener('DOMContentLoaded', initialize);
teacherForm.addEventListener('submit', handleSubmit);
searchInput.addEventListener('input', handleSearch);
logoutBtn.addEventListener('click', handleLogout);

// Initialize the page
async function initialize() {
    await Promise.all([
        loadClasses(),
        loadTeachers()
    ]);
    setupSorting();
}

// Load classes for the checkboxes
async function loadClasses() {
    try {
        const response = await fetch('/get-classes');
        const data = await response.json();
        classes = data.classes;
        
        // Create checkboxes for classes
        classesContainer.innerHTML = classes.map(className => `
            <div class="class-checkbox-wrapper">
                <input type="checkbox" 
                       id="class_${className}" 
                       name="classes" 
                       value="${className}">
                <label for="class_${className}">${className}</label>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading classes:', error);
        alert('Failed to load classes. Please try again.');
    }
}

// Load and display teachers
async function loadTeachers() {
    try {
        const response = await fetch('/get-teachers');
        const data = await response.json();
        teachers = data.teachers;
        displayTeachers(teachers);
    } catch (error) {
        console.error('Error loading teachers:', error);
        alert('Failed to load teachers. Please try again.');
    }
}

// Display teachers in the table
function displayTeachers(teachersToDisplay) {
    teachersTableBody.innerHTML = teachersToDisplay.map(teacher => `
        <tr>
            <td data-label="Teacher ID">${teacher.teacher_id}</td>
            <td data-label="Name">${teacher.name}</td>
            <td data-label="Subject">${teacher.subject}</td>
            <td data-label="Contact">${teacher.contact}</td>
            <td data-label="Classes">${teacher.classes || 'None'}</td>
            <td data-label="Actions">
                <div class="action-buttons">
                    <button class="edit-btn" onclick="editTeacher('${teacher.teacher_id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="deleteTeacher('${teacher.teacher_id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Modal functions
function openModal(teacherId = null) {
    currentTeacherId = teacherId;
    modal.classList.add('show');
    
    // Reset all checkboxes
    document.querySelectorAll('input[name="classes"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    if (teacherId) {
        modalTitle.textContent = 'Edit Teacher';
        const teacher = teachers.find(t => t.teacher_id === teacherId);
        if (teacher) {
            document.getElementById('teacherId').value = teacher.teacher_id;
            document.getElementById('teacherId').disabled = true;
            document.getElementById('teacherName').value = teacher.name;
            document.getElementById('subject').value = teacher.subject;
            document.getElementById('contact').value = teacher.contact;
            
            // Check the appropriate class checkboxes
            const teacherClasses = teacher.classes ? teacher.classes.split(',').map(c => c.trim()) : [];
            teacherClasses.forEach(className => {
                const checkbox = document.getElementById(`class_${className}`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }
    } else {
        modalTitle.textContent = 'Add New Teacher';
        teacherForm.reset();
        document.getElementById('teacherId').disabled = false;
    }
}

function closeModal() {
    modal.classList.remove('show');
    teacherForm.reset();
    currentTeacherId = null;
    // Reset all checkboxes
    document.querySelectorAll('input[name="classes"]').forEach(checkbox => {
        checkbox.checked = false;
    });
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();
    
    // Get selected classes from checkboxes - if none are selected, set to empty string
    const selectedClasses = Array.from(document.querySelectorAll('input[name="classes"]:checked'))
        .map(checkbox => checkbox.value)
        .join(', ');

    const formData = {
        teacher_id: document.getElementById('teacherId').value.toUpperCase(),
        name: document.getElementById('teacherName').value,
        subject: document.getElementById('subject').value,
        contact: document.getElementById('contact').value,
        classes: selectedClasses // This will be empty string if no classes are selected
    };

    try {
        let response;
        if (currentTeacherId) {
            // Update existing teacher - sending empty string for classes will remove all classes
            response = await fetch(`/update-teacher/${currentTeacherId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
        } else {
            // Add new teacher
            response = await fetch('/add_teacher', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
        }

        const data = await response.json();
        
        if (response.ok) {
            await loadTeachers();
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

// Delete teacher
async function deleteTeacher(teacherId) {
    if (!confirm('Are you sure you want to delete this teacher?')) {
        return;
    }

    try {
        const response = await fetch(`/delete-teacher/${teacherId}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        
        if (response.ok) {
            await loadTeachers();
            alert(data.message);
        } else {
            alert(data.detail || 'Failed to delete teacher');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to delete teacher. Please try again.');
    }
}

// Edit teacher
function editTeacher(teacherId) {
    openModal(teacherId);
}

// Search functionality
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredTeachers = teachers.filter(teacher =>
        teacher.teacher_id.toLowerCase().includes(searchTerm) ||
        teacher.name.toLowerCase().includes(searchTerm)
    );
    displayTeachers(filteredTeachers);
}

// Sorting functionality
function setupSorting() {
    const sortableHeaders = document.querySelectorAll('th.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            sortTeachers(column);
        });
    });
}

let currentSort = { column: null, ascending: true };

function sortTeachers(column) {
    const ascending = currentSort.column === column ? !currentSort.ascending : true;
    
    teachers.sort((a, b) => {
        let valueA = a[column] || '';
        let valueB = b[column] || '';
        
        if (ascending) {
            return valueA.localeCompare(valueB);
        } else {
            return valueB.localeCompare(valueA);
        }
    });
    
    currentSort = { column, ascending };
    displayTeachers(teachers);
}

// Logout functionality
async function handleLogout() {
    try {
        const response = await fetch('/logout', { method: 'POST' });
        if (response.ok) {
            window.location.href = '/static/html/login.html';
        } else {
            alert('Logout failed. Please try again.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Logout failed. Please try again.');
    }
} 