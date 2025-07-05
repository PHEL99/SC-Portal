window.addEventListener('DOMContentLoaded', async function() {
    const classesContainer = document.getElementById('classes-container');
    const studentsContainer = document.getElementById('students-in-class-container');
    classesContainer.textContent = 'Loading...';
    studentsContainer.innerHTML = '';
    try {
        const response = await fetch('/get-classes');
        const data = await response.json();
        if (response.ok && data.classes && data.classes.length > 0) {
            classesContainer.innerHTML = '';
            data.classes.forEach(className => {
                const classDiv = document.createElement('div');
                classDiv.className = 'class-item';
                classDiv.textContent = className;
                classDiv.style.cursor = 'pointer';
                classDiv.addEventListener('click', async function() {
                    // Highlight selected
                    document.querySelectorAll('.class-item').forEach(el => el.classList.remove('selected'));
                    classDiv.classList.add('selected');
                    studentsContainer.innerHTML = 'Loading students...';
                    try {
                        const resp = await fetch(`/students-in-class?class_name=${encodeURIComponent(className)}`);
                        const studentsData = await resp.json();
                        if (resp.ok && studentsData.students && studentsData.students.length > 0) {
                            let html = `<h3>Students in ${className}</h3>`;
                            html += `<table class='students-in-class-table'><thead><tr><th>Student ID</th><th>Name</th><th>Contact</th><th>Grade</th></tr></thead><tbody>`;
                            studentsData.students.forEach(student => {
                                html += `<tr><td>${student.student_id}</td><td>${student.name}</td><td>${student.contact}</td><td>${student.grade || ''}</td></tr>`;
                            });
                            html += '</tbody></table>';
                            studentsContainer.innerHTML = html;
                        } else {
                            studentsContainer.innerHTML = `<div class='form-message'>No students found in this class.</div>`;
                        }
                    } catch (err) {
                        studentsContainer.innerHTML = `<div class='form-message'>Failed to fetch students.</div>`;
                    }
                });
                classesContainer.appendChild(classDiv);
            });
        } else {
            classesContainer.innerHTML = '<div class="form-message">No classes found.</div>';
        }
    } catch (err) {
        classesContainer.innerHTML = '<div class="form-message">Failed to fetch classes.</div>';
    }
}); 