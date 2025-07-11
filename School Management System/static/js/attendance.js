// DOM Elements
const markTab = document.getElementById('markTab');
const viewTab = document.getElementById('viewTab');
const markContent = document.getElementById('markContent');
const viewContent = document.getElementById('viewContent');
const markClassSelect = document.getElementById('markClassSelect');
const viewClassSelect = document.getElementById('viewClassSelect');
const viewDate = document.getElementById('viewDate');
const markAttendanceBody = document.getElementById('markAttendanceBody');
const viewAttendanceBody = document.getElementById('viewAttendanceBody');
const submitAttendanceBtn = document.getElementById('submitAttendanceBtn');
const viewAttendanceBtn = document.getElementById('viewAttendanceBtn');
const attendanceSummary = document.getElementById('attendanceSummary');
const errorMessage = document.getElementById('errorMessage');

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadClasses();
        initializeEventListeners();
        // Set today's date as default for view attendance
        viewDate.valueAsDate = new Date();
    } catch (error) {
        showError('Failed to initialize the page. Please refresh.');
    }
});

// Event Listeners
function initializeEventListeners() {
    // Tab switching
    markTab.addEventListener('click', () => switchTab('mark'));
    viewTab.addEventListener('click', () => switchTab('view'));

    // Class selection
    markClassSelect.addEventListener('change', loadStudents);
    
    // View attendance
    viewAttendanceBtn.addEventListener('click', viewAttendance);
    
    // Submit attendance
    submitAttendanceBtn.addEventListener('click', submitAttendance);
}

// Tab Switching
function switchTab(tab) {
    if (tab === 'mark') {
        markTab.classList.add('active');
        viewTab.classList.remove('active');
        markContent.classList.add('active');
        viewContent.classList.remove('active');
    } else {
        viewTab.classList.add('active');
        markTab.classList.remove('active');
        viewContent.classList.add('active');
        markContent.classList.remove('active');
    }
}

// Load Classes
async function loadClasses() {
    try {
        const response = await fetch('/get-classes');
        if (!response.ok) throw new Error('Failed to fetch classes');
        
        const data = await response.json();
        const classes = data.classes.sort();
        
        // Update both select elements
        [markClassSelect, viewClassSelect].forEach(select => {
            select.innerHTML = '<option value="">Select a class</option>' +
                classes.map(cls => `<option value="${cls}">${cls}</option>`).join('');
        });
    } catch (error) {
        showError('Failed to load classes. Please refresh the page.');
        console.error('Error loading classes:', error);
    }
}

// Update the loadStudents function to use the new radio button styling
async function loadStudents() {
    const className = markClassSelect.value;
    if (!className) {
        markAttendanceBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Please select a class</td></tr>';
        submitAttendanceBtn.disabled = true;
        return;
    }

    try {
        setLoading(true);
        const response = await fetch(`/students-in-class?class_name=${encodeURIComponent(className)}`);
        if (!response.ok) throw new Error('Failed to fetch students');
        
        const data = await response.json();
        if (!data.students || data.students.length === 0) {
            markAttendanceBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No students found in this class</td></tr>';
            submitAttendanceBtn.disabled = true;
            return;
        }

        markAttendanceBody.innerHTML = data.students
            .sort((a, b) => a.student_id.localeCompare(b.student_id))
            .map(student => `
                <tr>
                    <td>${student.student_id}</td>
                    <td>${student.name}</td>
                    <td>
                        <div class="radio-group">
                            <label class="radio-label">
                                <input type="radio" name="attendance_${student.student_id}" value="present" checked>
                                <span class="radio-custom"></span>
                                Present
                            </label>
                            <label class="radio-label">
                                <input type="radio" name="attendance_${student.student_id}" value="absent">
                                <span class="radio-custom"></span>
                                Absent
                            </label>
                        </div>
                    </td>
                </tr>
            `).join('');
        
        submitAttendanceBtn.disabled = false;
    } catch (error) {
        showError('Failed to load students. Please try again.');
        console.error('Error loading students:', error);
        markAttendanceBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Error loading students</td></tr>';
        submitAttendanceBtn.disabled = true;
    } finally {
        setLoading(false);
    }
}

// Submit Attendance
async function submitAttendance() {
    const className = markClassSelect.value;
    if (!className) {
        showError('Please select a class');
        return;
    }

    try {
        setLoading(true);
        const absentStudents = [];
        const rows = markAttendanceBody.getElementsByTagName('tr');
        
        for (const row of rows) {
            const studentId = row.cells[0]?.textContent;
            const absentRadio = row.querySelector('input[value="absent"]:checked');
            if (studentId && absentRadio) {
                absentStudents.push(studentId);
            }
        }

        const response = await fetch('/take-attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                class_name: className,
                absent_students: absentStudents
            })
        });

        if (!response.ok) throw new Error('Failed to submit attendance');
        
        const result = await response.json();
        showSuccess(`Attendance submitted successfully. Present: ${result.present}, Absent: ${result.absent}`);
        
        // Refresh the view if we're looking at today's attendance
        if (viewDate.value === new Date().toISOString().split('T')[0] && 
            viewClassSelect.value === className) {
            await viewAttendance();
        }
    } catch (error) {
        showError('Failed to submit attendance. Please try again.');
        console.error('Error submitting attendance:', error);
    } finally {
        setLoading(false);
    }
}

// Update the viewAttendance function to add animation classes
async function viewAttendance() {
    const className = viewClassSelect.value;
    const date = viewDate.value;

    if (!className || !date) {
        showError('Please select both class and date');
        return;
    }

    try {
        setLoading(true);
        const response = await fetch(`/get-student-attendance?class_name=${encodeURIComponent(className)}&date=${encodeURIComponent(date)}`);
        if (!response.ok) throw new Error('Failed to fetch attendance records');
        
        const data = await response.json();
        
        // Remove old animation classes
        viewAttendanceBody.classList.remove('fade-in');
        attendanceSummary.classList.remove('fade-in');
        
        // Force reflow
        void viewAttendanceBody.offsetWidth;
        void attendanceSummary.offsetWidth;
        
        if (data.message) {
            viewAttendanceBody.innerHTML = `
                <tr>
                    <td colspan="2" style="text-align: center;">${data.message}</td>
                </tr>`;
            attendanceSummary.innerHTML = '';
            return;
        }

        let presentCount = 0;
        let absentCount = 0;

        viewAttendanceBody.innerHTML = data.attendance_records
            .sort((a, b) => a.student_id.localeCompare(b.student_id))
            .map(record => {
                const status = record.status.toLowerCase();
                if (status === 'present') presentCount++;
                else absentCount++;
                
                return `
                    <tr>
                        <td>${record.student_id}</td>
                        <td class="${status}">${record.status}</td>
                    </tr>
                `;
            }).join('');

        const total = presentCount + absentCount;
        const presentPercentage = ((presentCount / total) * 100).toFixed(1);
        const absentPercentage = (100 - presentPercentage).toFixed(1);

        attendanceSummary.innerHTML = `
            <h3>Attendance Summary for ${className} - ${date}</h3>
            <p><strong>Present:</strong> ${presentCount} students (${presentPercentage}%)</p>
            <p><strong>Absent:</strong> ${absentCount} students (${absentPercentage}%)</p>
            <p><strong>Total:</strong> ${total} students</p>
        `;

        // Add animation classes
        viewAttendanceBody.classList.add('fade-in');
        attendanceSummary.classList.add('fade-in');
    } catch (error) {
        showError('Failed to load attendance records. Please try again.');
        console.error('Error viewing attendance:', error);
        viewAttendanceBody.innerHTML = '<tr><td colspan="2" style="text-align: center;">Error loading attendance records</td></tr>';
        attendanceSummary.innerHTML = '';
    } finally {
        setLoading(false);
    }
}

// Update the loading animation
function setLoading(isLoading) {
    const buttons = [submitAttendanceBtn, viewAttendanceBtn];
    buttons.forEach(btn => {
        if (btn) {
            btn.disabled = isLoading;
            btn.classList.toggle('loading', isLoading);
            if (isLoading) {
                btn.setAttribute('data-original-text', btn.textContent);
                btn.textContent = 'Loading...';
            } else {
                btn.textContent = btn.getAttribute('data-original-text');
            }
        }
    });
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    errorMessage.textContent = message;
    errorMessage.style.backgroundColor = '#d4edda';
    errorMessage.style.color = '#155724';
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
        errorMessage.style.backgroundColor = '#f8d7da';
        errorMessage.style.color = '#dc3545';
    }, 5000);
} 