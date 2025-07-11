// Check authentication on page load
checkAuth();

// Get the search input element
const searchInput = document.getElementById('searchInput');
let currentGraduates = [];
let currentSort = {
    column: null,
    direction: 'asc'
};

// Function to load graduates
async function loadGraduates() {
    try {
        const response = await fetch('/get-graduates');
        if (!response.ok) {
            throw new Error('Failed to fetch graduates');
        }
        const data = await response.json();
        currentGraduates = data.graduates;
        displayGraduates(currentGraduates);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Function to sort graduates
function sortGraduates(graduates, column, direction) {
    return [...graduates].sort((a, b) => {
        let valueA = a[column];
        let valueB = b[column];

        // Convert to uppercase for string comparison
        if (typeof valueA === 'string') {
            valueA = valueA.toUpperCase();
            valueB = valueB.toUpperCase();
        }

        if (valueA < valueB) return direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

// Function to display graduates in the table
function displayGraduates(graduates) {
    const tableBody = document.getElementById('graduatesTableBody');
    tableBody.innerHTML = '';

    graduates.forEach(graduate => {
        const row = document.createElement('tr');
        const grade = calculateGrade(graduate.overall_marks);
        row.innerHTML = `
            <td>${graduate.student_id}</td>
            <td>${graduate.name}</td>
            <td>${grade} (${graduate.overall_marks.toFixed(1)}%)</td>
            <td>${graduate.contact}</td>
            <td>${graduate.graduation_year}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Function to calculate grade
function calculateGrade(marks) {
    if (marks >= 80) return 'A';
    if (marks >= 70) return 'B';
    if (marks >= 60) return 'C';
    return 'D';
}

// Add event listeners for sorting
document.querySelectorAll('.sortable').forEach(header => {
    header.addEventListener('click', () => {
        const column = header.dataset.sort;
        
        // Remove sorting classes from all headers
        document.querySelectorAll('.sortable').forEach(h => {
            if (h !== header) {
                h.classList.remove('asc', 'desc');
            }
        });

        // Toggle sort direction
        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            header.classList.toggle('asc', currentSort.direction === 'asc');
            header.classList.toggle('desc', currentSort.direction === 'desc');
        } else {
            currentSort.column = column;
            currentSort.direction = 'asc';
            header.classList.remove('desc');
            header.classList.add('asc');
        }

        // Sort and display graduates
        const sortedGraduates = sortGraduates(currentGraduates, column, currentSort.direction);
        displayGraduates(sortedGraduates);
    });
});

// Add search functionality
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredGraduates = currentGraduates.filter(graduate => 
        graduate.student_id.toLowerCase().includes(searchTerm) ||
        graduate.name.toLowerCase().includes(searchTerm)
    );
    displayGraduates(filteredGraduates);
});

// Load graduates on page load
loadGraduates(); 