document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page
    loadClasses();
    setupToggleButtons();
    setupFilters();
    setupSearch();
    setupAddClassModal();

    // Load initial data for overview section
    loadClassesOverview();
});

// Toggle buttons functionality
function setupToggleButtons() {
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    const sections = document.querySelectorAll('.content-section');

    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetSection = button.dataset.section;

            // Update buttons
            toggleButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Update sections
            sections.forEach(section => {
                if (section.id === `${targetSection}Section`) {
                    section.classList.add('active');
                } else {
                    section.classList.remove('active');
                }
            });
        });
    });
}

// Setup filters functionality
function setupFilters() {
    const classSelect = document.getElementById('classSelect');
    const viewType = document.getElementById('viewType');
    const subjectColumn = document.querySelector('.subject-column');

    // Event listeners for filters
    classSelect.addEventListener('change', updateResults);
    viewType.addEventListener('change', () => {
        const isTeachers = viewType.value === 'teachers';
        subjectColumn.classList.toggle('show', isTeachers);
        updateResults();
    });
}

// Load classes into select dropdown
async function loadClasses() {
    try {
        const response = await fetch('/get-classes');
        const data = await response.json();
        
        const classSelect = document.getElementById('classSelect');
        classSelect.innerHTML = '<option value="">Choose a class</option>';
        
        data.classes.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            classSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading classes:', error);
        showError('Failed to load classes');
    }
}

// Load classes overview with student counts
async function loadClassesOverview() {
    try {
        const response = await fetch('/get-classes');
        const data = await response.json();
        const classesGrid = document.querySelector('.classes-grid');
        classesGrid.innerHTML = '';

        for (const className of data.classes) {
            // Get students count
            const studentsResponse = await fetch(`/students-in-class?class_name=${className}`);
            const studentsData = await studentsResponse.json();
            const studentCount = studentsData.students.length;

            // Get teachers count
            const teachersResponse = await fetch(`/teachers-in-class?class_name=${className}`);
            const teachersData = await teachersResponse.json();
            const teacherCount = teachersData.teachers.length;

            const card = createClassCard(className, studentCount, teacherCount);
            classesGrid.appendChild(card);
        }
    } catch (error) {
        console.error('Error loading classes overview:', error);
        showError('Failed to load classes overview');
    }
}

// Create a class card element
function createClassCard(className, studentCount, teacherCount) {
    const card = document.createElement('div');
    card.className = 'class-card';
    card.innerHTML = `
        <h3 class="class-name">${className}</h3>
        <div class="class-stats">
            <div class="stat">
                <i class="fas fa-user-graduate"></i>
                <span>${studentCount} Students</span>
            </div>
            <div class="stat">
                <i class="fas fa-chalkboard-teacher"></i>
                <span>${teacherCount} Teachers</span>
            </div>
        </div>
    `;

    // Add click handler
    card.addEventListener('click', () => {
        // Switch to details section
        const toggleButtons = document.querySelectorAll('.toggle-btn');
        const sections = document.querySelectorAll('.content-section');
        
        // Update buttons
        toggleButtons.forEach(btn => {
            if (btn.dataset.section === 'details') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update sections
        sections.forEach(section => {
            if (section.id === 'detailsSection') {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });

        // Set the selected class in dropdown and trigger update
        const classSelect = document.getElementById('classSelect');
        classSelect.value = className;
        updateResults();
    });

    return card;
}

// Update results based on filters
async function updateResults() {
    const classSelect = document.getElementById('classSelect');
    const viewType = document.getElementById('viewType');
    const resultsTableBody = document.getElementById('resultsTableBody');
    const className = classSelect.value;

    if (!className) {
        resultsTableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Please select a class</td></tr>';
        return;
    }

    try {
        let response;
        if (viewType.value === 'students') {
            response = await fetch(`/students-in-class?class_name=${className}`);
            const data = await response.json();
            displayStudents(data.students);
        } else {
            response = await fetch(`/teachers-in-class?class_name=${className}`);
            const data = await response.json();
            displayTeachers(data.teachers);
        }
    } catch (error) {
        console.error('Error updating results:', error);
        showError('Failed to load results');
    }
}

// Display students in the results table
function displayStudents(students) {
    const resultsTableBody = document.getElementById('resultsTableBody');
    resultsTableBody.innerHTML = '';

    if (students.length === 0) {
        resultsTableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No students found in this class</td></tr>';
        return;
    }

    students.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.student_id}</td>
            <td>${student.name}</td>
            <td class="subject-column"></td>
        `;
        resultsTableBody.appendChild(row);
    });
}

// Display teachers in the results table
function displayTeachers(teachers) {
    const resultsTableBody = document.getElementById('resultsTableBody');
    resultsTableBody.innerHTML = '';

    if (teachers.length === 0) {
        resultsTableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No teachers found for this class</td></tr>';
        return;
    }

    teachers.forEach(teacher => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${teacher.teacher_id}</td>
            <td>${teacher.name}</td>
            <td class="subject-column show">${teacher.subject}</td>
        `;
        resultsTableBody.appendChild(row);
    });
}

// Show error message
function showError(message) {
    // You can implement your error display logic here
    console.error(message);
} 

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('classSearch');
    let searchTimeout;

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const searchTerm = searchInput.value.toLowerCase();
            const classCards = document.querySelectorAll('.class-card');

            classCards.forEach(card => {
                const className = card.querySelector('.class-name').textContent.toLowerCase();
                // Normalize both search term and class name for comparison
                const normalizedSearch = searchTerm.replace(/(\d+)[-]?([a-z])/i, '$1-$2');
                const normalizedClass = className.replace(/(\d+)[-]?([a-z])/i, '$1-$2');
                
                if (normalizedClass.includes(normalizedSearch)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }, 300);
    });
}

// Setup add class modal
function setupAddClassModal() {
    const modal = document.getElementById('addClassModal');
    const addBtn = document.getElementById('addClassBtn');
    const closeBtn = document.querySelector('.close-modal');
    const cancelBtn = document.querySelector('.cancel-btn');
    const saveBtn = document.getElementById('saveClassBtn');
    const classNameInput = document.getElementById('newClassName');

    // Format validation function
    function isValidClassFormat(className) {
        const formatRegex = /^[1-8]-[A-Z]$/;
        return formatRegex.test(className);
    }

    // Format the class name input as user types
    classNameInput.addEventListener('input', (e) => {
        let value = e.target.value.toUpperCase();
        
        // If user types a number followed by a letter, add the dash
        value = value.replace(/(\d)([A-Z])/g, '$1-$2');
        
        // Remove any character that's not a number, letter, or dash
        value = value.replace(/[^1-8A-Z-]/g, '');
        
        // Update the input value
        e.target.value = value;
    });

    // Open modal
    addBtn.addEventListener('click', () => {
        modal.classList.add('active');
        classNameInput.value = '';
        classNameInput.focus();
    });

    // Close modal functions
    const closeModal = () => {
        modal.classList.remove('active');
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Handle save
    saveBtn.addEventListener('click', async () => {
        const className = classNameInput.value.trim().toUpperCase();
        if (!className) {
            alert('Please enter a class name');
            return;
        }

        if (!isValidClassFormat(className)) {
            alert('Class name must be in the format "1-A" to "8-Z"');
            return;
        }

        try {
            const response = await fetch(`/add-class?name=${encodeURIComponent(className)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            console.log('Response:', response);
            console.log('Data:', data);

            if (response.ok) {
                closeModal();
                loadClassesOverview(); // Refresh the class list
                loadClasses(); // Refresh the dropdown in details section
            } else {
                const errorMessage = data.detail || data.message || 'Failed to add class';
                console.error('Error response:', errorMessage);
                alert(errorMessage);
            }
        } catch (error) {
            console.error('Error adding class:', error);
            alert('Failed to add class: ' + error.message);
        }
    });

    // Handle enter key in input
    classNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveBtn.click();
        }
    });
} 