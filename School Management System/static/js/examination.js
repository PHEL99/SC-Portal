// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await checkAuth();
        loadClasses();
    } catch (error) {
        window.location.href = 'login.html';
    }
});

// Load classes into both dropdowns
async function loadClasses() {
    try {
        const response = await fetch('/get-classes');
        const data = await response.json();
        
        const classSelects = ['class-select', 'search-class'];
        classSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            select.innerHTML = '<option value="">Select Class</option>';
            data.classes.forEach(className => {
                const option = document.createElement('option');
                option.value = className;
                option.textContent = className;
                select.appendChild(option);
            });
        });
    } catch (error) {
        showError('Failed to load classes');
    }
}

// Toggle between Add Marks and View Results sections
function toggleView(sectionId) {
    const sections = document.querySelectorAll('.exam-section');
    sections.forEach(section => section.classList.remove('active'));
    
    const buttons = document.querySelectorAll('.toggle-btn');
    buttons.forEach(button => button.classList.remove('active'));
    
    document.getElementById(sectionId).classList.add('active');
    event.target.classList.add('active');
}

// Add a new subject field
function addSubjectField() {
    const container = document.querySelector('.subjects-container');
    const subjectEntry = document.createElement('div');
    subjectEntry.className = 'subject-entry';
    
    subjectEntry.innerHTML = `
        <input type="text" class="subject-input" placeholder="Enter Subject Name">
        <input type="number" class="marks-input" placeholder="Enter Marks" min="0" max="100">
        <button class="remove-subject-btn" onclick="removeSubjectField(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(subjectEntry);
}

// Remove a subject field
function removeSubjectField(button) {
    button.parentElement.remove();
}

// Submit marks
async function submitMarks() {
    const studentId = document.getElementById('student-id').value;
    const className = document.getElementById('class-select').value;
    const examType = document.getElementById('exam-type').value;
    
    // Validation
    if (!studentId || !className || !examType) {
        showError('Please fill in all required fields');
        return;
    }
    
    const subjectEntries = document.querySelectorAll('.subject-entry');
    if (subjectEntries.length === 0) {
        showError('Please add at least one subject');
        return;
    }
    
    // Collect all subjects and marks
    const marksPromises = Array.from(subjectEntries).map(async entry => {
        const subject = entry.querySelector('.subject-input').value;
        const marks = entry.querySelector('.marks-input').value;
        
        if (!subject || !marks) {
            throw new Error('Please fill in all subject fields');
        }
        
        if (marks < 0 || marks > 100) {
            throw new Error('Marks must be between 0 and 100');
        }
        
        try {
            const response = await fetch('/add-marks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    student_id: studentId,
                    class_name: className,
                    subject: subject,
                    marks: parseInt(marks),
                    exam_type: examType
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to add marks');
            }
            
            return response.json();
        } catch (error) {
            throw error;
        }
    });
    
    try {
        await Promise.all(marksPromises);
        showSuccess('Marks added successfully');
        clearForm();
        
        // Dispatch a custom event to notify that marks have been updated
        const marksUpdatedEvent = new CustomEvent('marksUpdated', {
            detail: {
                studentId: studentId,
                className: className,
                examType: examType
            }
        });
        window.dispatchEvent(marksUpdatedEvent);
        
        // Also store the last update in localStorage to handle page refreshes
        localStorage.setItem('lastMarksUpdate', JSON.stringify({
            timestamp: Date.now(),
            studentId: studentId,
            className: className,
            examType: examType
        }));
    } catch (error) {
        showError(error.message);
    }
}

// View results
async function viewResults() {
    const studentId = document.getElementById('search-student-id').value;
    const selectedClass = document.getElementById('search-class').value;
    const examType = document.getElementById('search-exam-type').value;
    
    if (!studentId || !examType) {
        showError('Please fill in student ID and exam type');
        return;
    }
    
    try {
        // First fetch student details to get current class and name
        const studentResponse = await fetch(`/search-student?query=${studentId}`);
        const studentData = await studentResponse.json();
        
        if (!studentData.student || studentData.student.length === 0) {
            showError('Student not found');
            return;
        }

        const studentDetails = studentData.student[0];
        
        // Then fetch student's classes
        const classesResponse = await fetch(`/get-student-classes/${studentId}`);
        const classesData = await classesResponse.json();
        
        if (!classesData.classes || classesData.classes.length === 0) {
            showError('No results found for this student');
            return;
        }

        // Filter classes based on selection
        let classesToCheck = selectedClass ? [selectedClass] : classesData.classes;

        // Get results for each class
        const resultsPromises = classesToCheck.map(async className => {
            if (examType === 'FINAL') {
                // Get both MID and FINAL results for overall calculation
                const midResponse = await fetch(`/get-marks/${studentId}?class_name=${className}&exam_type=MID`);
                const finalResponse = await fetch(`/get-marks/${studentId}?class_name=${className}&exam_type=FINAL`);
                
                const midData = await midResponse.json();
                const finalData = await finalResponse.json();
                
                // Skip if no final results
                if (finalData.message) {
                    return null;
                }
                
                // Process and combine the data
                const data = processFinalResults(midData, finalData);
                data.studentName = studentDetails.name;
                data.studentClass = className;
                return data;
            } else {
                const response = await fetch(`/get-marks/${studentId}?class_name=${className}&exam_type=${examType}`);
                const data = await response.json();
                
                // Skip if no results found for this class
                if (data.message) {
                    return null;
                }
                
                // Add student details
                data.studentName = studentDetails.name;
                data.studentClass = className;
                return data;
            }
        });

        const allResults = (await Promise.all(resultsPromises)).filter(result => result !== null);
        
        if (allResults.length === 0) {
            showError(`No ${examType} term results found for ${selectedClass ? `class ${selectedClass}` : 'any class'}`);
            return;
        }
        
        displayAllResults(allResults, examType, studentDetails);
    } catch (error) {
        showError(error.message);
    }
}

// Process and combine mid-term and final results
function processFinalResults(midData, finalData) {
    // Helper function to round to nearest .5
    function roundToHalf(num) {
        return Math.round(num * 2) / 2;
    }

    const result = {
        student_id: finalData.student_id,
        student_name: finalData.student_name,
        class_name: finalData.class_name,
        exam_type: 'FINAL',
        subjects: [],
        total_marks: 0,
        total_subjects: 0,
        percentage: 0,
        overall_grade: ''
    };

    // Process each subject
    finalData.subjects.forEach(finalSubject => {
        const midSubject = midData.subjects ? 
            midData.subjects.find(s => s.subject === finalSubject.subject) : null;

        const midMarks = midSubject ? midSubject.marks : 0;
        const finalMarks = finalSubject.marks;
        
        // Calculate weighted total (30% mid + 70% final)
        const weightedTotal = roundToHalf((midMarks * 0.3) + (finalMarks * 0.7));
        
        result.subjects.push({
            subject: finalSubject.subject,
            midMarks: midSubject ? midMarks : 'N/A',
            marks: finalMarks,
            grade: finalSubject.grade,
            weightedTotal: weightedTotal
        });

        result.total_marks += weightedTotal;
        result.total_subjects++;
    });

    // Calculate overall percentage and grade
    if (result.total_subjects > 0) {
        result.percentage = roundToHalf((result.total_marks / result.total_subjects));
        result.overall_grade = calculateGrade(result.percentage);
    }

    return result;
}

// Calculate grade based on marks
function calculateGrade(marks) {
    if (marks >= 80) return 'A';
    if (marks >= 70) return 'B';
    if (marks >= 60) return 'C';
    return 'D';
}

// Display results for all classes
function displayAllResults(allResults, examType, studentDetails) {
    // Helper function to round to nearest .5
    function roundToHalf(num) {
        return Math.round(num * 2) / 2;
    }

    const resultsDisplay = document.querySelector('.results-display');
    let html = '';

    allResults.forEach(data => {
        html += `
            <div class="student-info">
                <div class="info-row">
                    <span class="info-label">Student ID:</span>
                    <span class="info-value">${data.student_id}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${data.student_name}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Class:</span>
                    <span class="info-value">${data.class_name}</span>
                </div>
            </div>
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Subject</th>
                        ${examType === 'FINAL' ? '<th>Mid Term</th>' : ''}
                        <th>${examType === 'FINAL' ? 'Final Term' : 'Marks'}</th>
                        <th>Grade</th>
                        ${examType === 'FINAL' ? '<th>Overall</th>' : ''}
                    </tr>
                </thead>
                <tbody>`;

        data.subjects.forEach(subject => {
            const midMarks = examType === 'FINAL' ? subject.midMarks || 'N/A' : null;
            const finalMarks = examType === 'FINAL' ? subject.marks : subject.marks;
            const weightedTotal = examType === 'FINAL' ? roundToHalf((midMarks === 'N/A' ? 0 : midMarks * 0.3) + (finalMarks * 0.7)) : null;

            html += `
                <tr>
                    <td>${subject.subject}</td>
                    ${examType === 'FINAL' ? `<td>${midMarks}</td>` : ''}
                    <td>${finalMarks}</td>
                    <td>${subject.grade}</td>
                    ${examType === 'FINAL' ? `<td>${weightedTotal || 'N/A'}</td>` : ''}
                </tr>`;
        });

        html += `
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="${examType === 'FINAL' ? '5' : '3'}">
                            <strong>Overall Marks: ${roundToHalf(data.total_marks)}</strong><br>
                            <strong>Overall Percentage: ${roundToHalf(data.percentage)}%</strong><br>
                            <strong>Overall Grade: ${data.overall_grade}</strong>
                        </td>
                    </tr>
                </tfoot>
            </table>`;
    });

    resultsDisplay.innerHTML = html;
}

// Helper function to show error messages
function showError(message) {
    const resultsDisplay = document.querySelector('.results-display');
    resultsDisplay.innerHTML = `<div class="error-message">${message}</div>`;
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    // Remove any existing success messages
    document.querySelectorAll('.success-message').forEach(el => el.remove());
    
    // Add the new success message
    document.querySelector('.examination-container').insertAdjacentElement('afterbegin', successDiv);
    
    // Remove the success message after 5 seconds
    setTimeout(() => successDiv.remove(), 5000);
}

function clearForm() {
    document.getElementById('student-id').value = '';
    document.getElementById('class-select').value = '';
    document.getElementById('exam-type').value = '';
    document.querySelector('.subjects-container').innerHTML = '';
} 

// Promote Modal Functions
function openPromoteModal() {
    document.getElementById('promote-modal').classList.add('show');
}

function closePromoteModal() {
    document.getElementById('promote-modal').classList.remove('show');
    document.getElementById('confirm-promote').checked = false;
    togglePromoteButton();
}

function togglePromoteButton() {
    const checkbox = document.getElementById('confirm-promote');
    const promoteButton = document.getElementById('proceed-promote');
    promoteButton.disabled = !checkbox.checked;
}

async function promoteStudents() {
    try {
        const response = await fetch('/promote-students', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            showSuccess(`Promotion completed successfully! 
                        Promoted: ${data.promoted} students
                        Graduated: ${data.graduated} students
                        Retained: ${data.retained} students`);
            closePromoteModal();
        } else {
            throw new Error(data.detail || 'Failed to promote students');
        }
    } catch (error) {
        showError(error.message);
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('promote-modal');
    if (event.target === modal) {
        closePromoteModal();
    }
}; 