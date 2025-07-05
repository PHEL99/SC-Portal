from fastapi import FastAPI, Request, Form, HTTPException, Depends, Query, Body
from starlette.middleware.sessions import SessionMiddleware
from sqlite3 import connect
from pydantic import BaseModel
from typing import List
from datetime import datetime
import db
import sqlite3
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
import os
import re



app = FastAPI()
app.add_middleware(SessionMiddleware, secret_key="your-secret-key")
app.mount("/static", StaticFiles(directory="static"), name="static")


# ---------- Initialize DB ----------
db.init_db()
db.init_student_db()
db.init_teacher_db()
db.init_classes_db()
db.init_attendance_db()


@app.get("/")
def read_root(request: Request):
    user = request.session.get("user")
    if user:
        return RedirectResponse(url="/static/dashboard.html")
    login_path = os.path.join("static", "login.html")
    if not os.path.exists(login_path):
        return {"error": "login.html not found"}
    return FileResponse(login_path)

# ---------- Helper: Verify user ----------
def verify_user(username: str, password: str):
    conn = connect("users.db")
    cursor = conn.cursor()
    cursor.execute("SELECT hashed_password FROM admin WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return False
    return db.pwd_context.verify(password, row[0])

# ---------- API Endpoints ----------

@app.post("/login")
def login(request: Request, username: str = Form(...), password: str = Form(...)):
    if verify_user(username, password):
        request.session["user"] = username
        return {"message": "Login successful"}
    raise HTTPException(status_code=401, detail="Invalid username or password")

@app.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"message": "Logged out"}

def get_user(request: Request):
    user = request.session.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


class Student(BaseModel):
    student_id: str
    name: str
    class_name: str
    contact: str
    grade: str = None

class Teacher(BaseModel):
    teacher_id: str
    name: str
    subject: str
    classes: str = None
    contact: str

class StudentUpdate(BaseModel):
    name: str = None
    class_name: str = None
    contact: str = None
    grade: str = None

class TeacherUpdate(BaseModel):
    name: str = None
    subject: str = None
    classes: str = None
    contact: str = None

@app.post("/add-class")
def add_class(name: str, user: str = Depends(get_user)):
    conn = connect("classes.db")
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO classes (name) VALUES (?)", (name.upper(),))
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Class already exists")
    finally:
        conn.close()
    return {"message": f"Class '{name}' added."}

@app.get("/get-classes")
def get_classes(user: str = Depends(get_user)):
    conn = connect("classes.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM classes")
    classes = []
    for row in cursor.fetchall():
        classes.append(row["name"])
    conn.close()
    return {"classes": classes}

def class_check(student: Student):
    conn = connect("classes.db")
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM classes WHERE name = ?", (student.class_name.upper(),))
    class_name = cursor.fetchone()
    conn.close()
    return class_name

@app.post("/add_student")
def add_student(student: Student, user: str = Depends(get_user)):
    conn = connect("students.db")
    cursor = conn.cursor()
 
    if not class_check(student):
        raise HTTPException(status_code=400, detail="Class does not exist.")
 
    cursor.execute("SELECT * FROM students WHERE student_id = ?", (student.student_id.upper(),))
    existing_student = cursor.fetchone()

    if existing_student:
        conn.close()
        return {"error": "Student already exists."}

    # Insert student
    cursor.execute(
        "INSERT INTO students (student_id, name, class_name, contact, grade) VALUES (?, ?, ?, ?, ?)",
        (student.student_id.upper(), student.name, student.class_name.upper(), student.contact, student.grade.upper())
    )
    conn.commit()
    conn.close()

    return {"message": f"Student {student.name} added successfully!"}


@app.get("/get-students")
def get_all_students(user: str = Depends(get_user)):
    conn = connect("students.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM students")
    rows = cursor.fetchall()
    conn.close()

    # Convert rows to list of dicts
    students = []
    for row in rows:
        students.append({
            "student_id": row["student_id"],
            "name": row["name"],
            "class_name": row["class_name"],
            "contact": row["contact"],
            "grade": row["grade"],
        })

    return {"students": students}

@app.delete("/delete-student/{student_id}")
def delete_student(student_id: str, user: str = Depends(get_user)):
    conn = connect("students.db")
    cursor = conn.cursor()

    # Check if student exists (case-insensitive)
    cursor.execute("SELECT * FROM students WHERE UPPER(student_id) = UPPER(?)", (student_id,))
    student = cursor.fetchone()

    if not student:
        conn.close()
        raise HTTPException(status_code=404, detail="Student does not exist.")

    # Delete the student (case-insensitive)
    cursor.execute("DELETE FROM students WHERE UPPER(student_id) = UPPER(?)", (student_id,))
    conn.commit()
    conn.close()

    return {"message": f"Student with ID {student_id} deleted successfully"}


@app.post("/add_teacher")
def add_teacher(teacher: Teacher, user: str = Depends(get_user)):
    conn = connect("teachers.db")
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM teachers WHERE teacher_id = ?", (teacher.teacher_id.upper(),))
    existing_teacher = cursor.fetchone()

    if existing_teacher:
        conn.close()
        return {"error": "Teacher already exists."}

    cursor.execute(
        "INSERT INTO teachers (teacher_id, name, subject, classes, contact) VALUES (?, ?, ?, ?, ?)",
        (teacher.teacher_id.upper(), teacher.name, teacher.subject, teacher.classes.upper(), teacher.contact)
    )
    conn.commit()
    conn.close()

    return {"message": f"Teacher {teacher.name} added successfully!"}


@app.get("/get-teachers")
def get_all_teachers(user: str = Depends(get_user)):
    conn = connect("teachers.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM teachers")
    rows = cursor.fetchall()
    conn.close()

    # Convert rows to list of dicts
    teachers = []
    for row in rows:
        teachers.append({
            "teacher_id": row["teacher_id"],
            "name": row["name"],
            "subject": row["subject"],
            "contact": row["contact"],
            "classes": row["classes"],
        })

    return {"teachers": teachers}

@app.delete("/delete-teacher/{teacher_id}")
def delete_teacher(teacher_id: str, user: str = Depends(get_user)):
    conn = connect("teachers.db")
    cursor = conn.cursor()

    # Check if student exists
    cursor.execute("SELECT * FROM teachers WHERE teacher_id = ?", (teacher_id.upper(),))
    teacher = cursor.fetchone()

    if not teacher:
        conn.close()
        return {"error": "Teacher not found"}

    # Delete the student
    cursor.execute("DELETE FROM teachers WHERE teacher_id = ?", (teacher_id,))
    conn.commit()
    conn.close()

    return {"message": f"Teacher with ID {teacher_id} deleted successfully"}


@app.get("/search-student")
def search_student(query: str = Query(..., description="Enter student ID or name"), user: str = Depends(get_user)):
    conn = connect("students.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM students WHERE LOWER(student_id) = LOWER(?)", (query,))
    student = cursor.fetchall()

    # If not found by ID, try by name
    if not student:
        cursor.execute("SELECT * FROM students WHERE LOWER(name) = LOWER(?)", (query,))
        student = cursor.fetchall()
    conn.close()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    
    details = []
    for row in student:
        details.append({
            "student_id": row["student_id"],
            "name": row["name"],
            "class_name": row["class_name"],
            "contact": row["contact"],
            "grade": row["grade"],
        })
    return {"student": details}


@app.get("/search-teacher")
def search_teacher(query: str = Query(..., description="Enter teacher ID or name"), user: str = Depends(get_user)):
    conn = connect("teachers.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM teachers WHERE LOWER(teacher_id) = LOWER(?)", (query,))
    teacher = cursor.fetchall()

    # If not found by ID, try by name
    if not teacher:
        cursor.execute("SELECT * FROM teachers WHERE LOWER(name) = LOWER(?)", (query,))
        teacher = cursor.fetchall()
    conn.close()

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found.")
    
    details = []
    for row in teacher:
        details.append({
            "teacher_id": row["teacher_id"],
            "name": row["name"],
            "subject": row["subject"],
            "contact": row["contact"],
            "classes": row["classes"],
        })
    return {"teacher": details}

@app.get("/students-in-class")
def get_students_in_class(class_name: str, user: str = Depends(get_user)):
    conn = connect("students.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM students WHERE LOWER(class_name) = LOWER(?)", (class_name,))
    students = cursor.fetchall()
    conn.close()
    class_conn = connect("classes.db")
    class_cursor = class_conn.cursor()
    class_cursor.execute("SELECT * FROM classes WHERE LOWER(name) = LOWER(?)", (class_name,))
    class_exists = class_cursor.fetchone()
    class_conn.close()
    if not class_exists:
        raise HTTPException(status_code=404, detail="Class not found.")

    result = []
    for row in students:
        result.append({
            "student_id": row["student_id"],
            "name": row["name"],
            "class_name": row["class_name"],
            "contact": row["contact"],
            "grade": row["grade"],
        })
    return {"students": result}

@app.put("/update-student/{student_id}")
def update_student(student_id: str, student: StudentUpdate, user: str = Depends(get_user)):
    conn = connect("students.db")
    cursor = conn.cursor()

    # Check if student exists
    cursor.execute("SELECT * FROM students WHERE student_id = ?", (student_id.upper(),))
    existing_student = cursor.fetchone()

    if not existing_student:
        conn.close()
        raise HTTPException(status_code=404, detail="Student not found")

    # Check if class exists if class_name is being updated
    if student.class_name:
        if not class_check(student):
            conn.close()
            raise HTTPException(status_code=400, detail="Class does not exist")

    # Build update query dynamically based on provided fields
    update_fields = []
    values = []
    if student.name:
        update_fields.append("name = ?")
        values.append(student.name)
    if student.class_name:
        update_fields.append("class_name = ?")
        values.append(student.class_name.upper())
    if student.contact:
        update_fields.append("contact = ?")
        values.append(student.contact)
    if student.grade:
        update_fields.append("grade = ?")
        values.append(student.grade.upper())

    if update_fields:
        query = f"UPDATE students SET {', '.join(update_fields)} WHERE student_id = ?"
        values.append(student_id.upper())
        cursor.execute(query, values)
        conn.commit()
        conn.close()
        return {"message": f"Student with ID {student_id} updated successfully"}
    
    conn.close()
    return {"message": "No fields to update"}

@app.put("/update-teacher/{teacher_id}")
def update_teacher(teacher_id: str, teacher: TeacherUpdate, user: str = Depends(get_user)):
    conn = connect("teachers.db")
    cursor = conn.cursor()

    # Check if student exists
    cursor.execute("SELECT * FROM teachers WHERE teacher_id = ?", (teacher_id.upper(),))
    existing_teacher = cursor.fetchone()

    if not existing_teacher:
        conn.close()
        raise HTTPException(status_code=404, detail="Teacher not found")

    update_fields = []
    values = []
    if teacher.name:
        update_fields.append("name = ?")
        values.append(teacher.name)
    if teacher.subject:
        update_fields.append("subject = ?")
        values.append(teacher.subject.upper())
    if teacher.classes:
        update_fields.append("classes = ?")
        values.append(teacher.classes.upper())
    if teacher.contact:
        update_fields.append("contact = ?")
        values.append(teacher.contact)

    if update_fields:
        query = f"UPDATE teachers SET {', '.join(update_fields)} WHERE teacher_id = ?"
        values.append(teacher_id.upper())
        cursor.execute(query, values)
        conn.commit()
        conn.close()
        return {"message": f"Teacher with ID {teacher_id} updated successfully"}
    
    conn.close()
    return {"message": "No fields to update"}


class AttendanceRequest(BaseModel):
    class_name: str
    absent_students: List[str]

@app.post("/take-attendance")
def take_attendance(
    attendance: AttendanceRequest,
    user: str = Depends(get_user)
):
    class_name = attendance.class_name
    absent_students = attendance.absent_students

    # Get current date in YYYY-MM-DD format
    date = datetime.now().strftime("%Y-%m-%d")
    
    # Validate class exists
    conn_classes = connect("classes.db")
    cursor_classes = conn_classes.cursor()
    cursor_classes.execute("SELECT name FROM classes WHERE UPPER(name) = UPPER(?)", (class_name,))
    class_exists = cursor_classes.fetchone()
    conn_classes.close()
    
    if not class_exists:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Get all students in the class
    conn_students = connect("students.db")
    conn_students.row_factory = sqlite3.Row
    cursor_students = conn_students.cursor()
    cursor_students.execute("SELECT student_id, name FROM students WHERE UPPER(class_name) = UPPER(?)", (class_name,))
    students = cursor_students.fetchall()
    conn_students.close()
    
    if not students:
        raise HTTPException(status_code=404, detail="No students found in this class")
    
    # Validate that all absent student IDs exist in the class
    student_ids_in_class = {student["student_id"].upper() for student in students}
    invalid_student_ids = []
    
    for student_id in absent_students:
        if student_id.upper() not in student_ids_in_class:
            invalid_student_ids.append(student_id)
    
    if invalid_student_ids:
        raise HTTPException(
            status_code=400, 
            detail=f"The following student IDs do not exist in this class: {', '.join(invalid_student_ids)}"
        )
    
    # Connect to attendance database
    conn_attendance = connect("attendance.db")
    cursor_attendance = conn_attendance.cursor()

    # DELETE previous attendance records for this class and date
    cursor_attendance.execute(
        "DELETE FROM attendance WHERE class_name = ? AND date = ?",
        (class_name.upper(), date)
    )

    # Record attendance for each student
    attendance_records = []
    for student in students:
        status = "absent" if any(student["student_id"].upper() == s.upper() for s in absent_students) else "present"
        cursor_attendance.execute(
            "INSERT INTO attendance (student_id, class_name, date, status) VALUES (?, ?, ?, ?)",
            (student["student_id"], class_name.upper(), date, status)
        )
        attendance_records.append({
            "student_id": student["student_id"],
            "name": student["name"],
            "status": status
        })
    conn_attendance.commit()
    conn_attendance.close()
    
    return {
        "message": f"Attendance recorded for {class_name.upper()} on {date}",
        "absent": len(absent_students),
        "present": len(students) - len(absent_students),
        "records": attendance_records
    }

@app.get("/get-student-attendance")
def get_student_attendance(class_name: str, date: str, user: str = Depends(get_user)):
    conn = connect("attendance.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT * FROM attendance WHERE class_name = ? AND date = ?",
        (class_name.upper(), date)
    )
    attendance_records = cursor.fetchall()
    conn.close()
    
    if not attendance_records:
        return {"message": f"No attendance records found for class '{class_name.upper()}' on {date}"}
    
    result = []
    for record in attendance_records:
        result.append({
            "id": record["id"],
            "student_id": record["student_id"],
            "date": record["date"],
            "status": record["status"],
            "class_name": record["class_name"]
        })
    
    return {
        "attendance_records": result,
        "total_records": len(result),
        "class_name": class_name.upper(),
        "date": date
    }

@app.post('/chatbot')
def chatbot_proxy(request: Request, payload: dict = Body(...)):
    user_message = payload.get('message', '').lower()

    def classify_intent(msg):
        # List all students
        if any(
            phrase in msg for phrase in [
                'show me all students',
                'show me students',
                'list students',
                'who are the students',
                'who are the students?',
                'show students',
                'all students',
                'list all students',
                'list all students?',
                'show all students',
                'all students?',
                'all students',
                'give me students',
                'give me all students'
            ]
        ):
            return 'list_students'
        # List all teachers
        if any(
            phrase in msg for phrase in [
                'show me all teachers',
                'show me teachers',
                'list teachers',
                'who are the teachers',
                'who are the teachers?',
                'show teachers',
                'all teachers',
                'list all teachers',
                'list all teachers?',
                'show all teachers',
                'all teachers?',
                'give me teachers',
                'give me all teachers'
            ]
        ):
            return 'list_teachers'
        # List all classes
        if any(
            phrase in msg for phrase in [
                'show me all classes',
                'list classes',
                'what classes are there',
                'what classes are there?',
                'show classes',
                'all classes',
                'list all classes',
                'list all classes?',
                'show all classes',
                'all classes?',
                'give me classes',
                'give me all classes'
            ]
        ):
            return 'list_classes'
        # List attendance records
        if any(
            phrase in msg for phrase in [
                'show attendance records',
                'how many attendance records are there',
                'how many attendance records are there?',
                'list attendance',
                'show attendance',
                'all attendance',
                'list all attendance',
                'list all attendance?',
                'show all attendance',
                'all attendance?',
                'give attendance',
                'give me attendance',
                'give me all attendance',
                'attendance records',
                'attendance record',
                'attendance list',
                'attendance logs'
            ]
        ):
            return 'list_attendance'
        # List students in a specific class
        if any(
            phrase in msg for phrase in [
                'students in class',
                'list students in class',
                'show students in class',
                'who are the students in class',
                'students of class',
                'students from class',
                'students for class'
            ]
        ):
            return 'list_students_in_class'
        # List teachers for a specific class
        if any(
            phrase in msg for phrase in [
                'teachers for class',
                'list teachers for class',
                'show teachers for class',
                'who are the teachers for class',
                'teachers in class',
                'teachers of class',
                'teachers teaching class',
                'teachers that teach class',
                'teaches class',
                'teachers in class',
                'teachers of class',
                'teachers teaching class',
                'teachers that teach class',
                'teache class'
            ]
        ):
            return 'list_teachers_for_class'
        # Add a new class
        if any(
            phrase in msg for phrase in [
                'add class',
                'create class',
                'new class',
                'make class'
            ]
        ):
            return 'add_class'
        # Delete a student
        if any(
            phrase in msg for phrase in [
                'delete student',
                'remove student',
                'erase student',
                'drop student'
            ]
        ):
            return 'delete_student'
        # Delete a teacher
        if any(
            phrase in msg for phrase in [
                'delete teacher',
                'remove teacher',
                'erase teacher',
                'drop teacher'
            ]
        ):
            return 'delete_teacher'
        # Search for a student by ID or name
        if any(
            phrase in msg for phrase in [
                'find student',
                'search for student',
                'search student',
                'lookup student',
                'find student',
                'search',
                'find',
                'lookup',
                
            ]
        ):
            return 'search_student'
        # Add a new student
        if any(
            phrase in msg for phrase in [
                'add student',
                'create student',
                'new student',
                'register student'
            ]
        ):
            return 'add_student'
        # Add a new teacher
        if any(
            phrase in msg for phrase in [
                'add teacher',
                'create teacher',
                'new teacher',
                'register teacher'
            ]
        ):
            return 'add_teacher'
        # Update a student
        if any(
            phrase in msg for phrase in [
                'update student',
                'edit student',
                'modify student',
                'change student'
            ]
        ):
            return 'update_student'
        # Update a teacher
        if any(
            phrase in msg for phrase in [
                'update teacher',
                'edit teacher',
                'modify teacher',
                'change teacher'
            ]
        ):
            return 'update_teacher'
        # Take attendance
        if any(
            phrase in msg for phrase in [
                'take attendance',
                'mark attendance',
                'record attendance'
            ]
        ):
            return 'take_attendance'
        return 'other'

    intent = classify_intent(user_message)

    user = request.session.get("user")
    if not user:
        return { 'reply': 'You must be logged in to view this information.' }

    if intent == "list_students":
        # New: Match commands.txt style for listing all students
        conn = connect("students.db")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM students")
        rows = cursor.fetchall()
        conn.close()
        if not rows:
            return { 'reply': 'No students found.' }
        reply_lines = [
            f"Student ID: {row['student_id']}, Name: {row['name']}, Class: {row['class_name']}, Contact: {row['contact']}, Grade: {row['grade']}\n"
            for row in rows
        ]
        reply = "All Students:\n" + "".join(reply_lines)
        return { 'reply': reply }

    elif intent == "list_teachers":
        # New: Match commands.txt style for listing all teachers
        conn = connect("teachers.db")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM teachers")
        rows = cursor.fetchall()
        conn.close()
        if not rows:
            return { 'reply': 'No teachers found.' }
        reply_lines = [
            f"ID: {row['teacher_id']}, Name: {row['name']}, Subject: {row['subject']}, Classes: {row['classes']}, Contact: {row['contact']}\n"
            for row in rows
        ]
        reply = "All Teachers:\n" + "".join(reply_lines)
        return { 'reply': reply }

    elif intent == "list_classes":
        # New: Match commands.txt style for listing all classes
        conn = connect("classes.db")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM classes")
        rows = cursor.fetchall()
        conn.close()
        if not rows:
            return { 'reply': 'No classes found.' }
        reply_lines = [
            f"Class Name: {row['name']}\n"
            for row in rows
        ]
        reply = "All Classes:\n" + "".join(reply_lines)
        return { 'reply': reply }

    elif intent == "list_attendance":
        # Enhanced: Attendance records for a specific class if specified
        # Try to extract class name from the user message
        class_match = re.search(r'class\s+([a-zA-Z0-9]+)', user_message)
        if class_match:
            class_name = class_match.group(1).upper()
            conn = connect("attendance.db")
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM attendance WHERE UPPER(class_name) = ?", (class_name,))
            rows = cursor.fetchall()
            conn.close()
            if not rows:
                return { 'reply': f'No attendance records found for class {class_name}.' }
            reply_lines = [
                f"ID: {row['id']}, Student ID: {row['student_id']}, Class: {row['class_name']}, Date: {row['date']}, Status: {row['status']}\n"
                for row in rows
            ]
            reply = f"Attendance Records for Class {class_name}:\n" + "".join(reply_lines)
            return { 'reply': reply }
        else:
            return { 'reply': 'Please specify a class to view attendance records. For example: "Show attendance for class A"' }

    elif intent == "list_students_in_class":
        # List students in a specific class
        class_match = re.search(r'class\s+([a-zA-Z0-9]+)', user_message)
        if class_match:
            class_name = class_match.group(1).upper()
            conn = connect("students.db")
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM students WHERE UPPER(class_name) = ?", (class_name,))
            rows = cursor.fetchall()
            conn.close()
            if not rows:
                return { 'reply': f'No students found in class {class_name}.' }
            reply_lines = [
                f"Student ID: {row['student_id']}, Name: {row['name']}, Class: {row['class_name']}, Contact: {row['contact']}, Grade: {row['grade']}\n"
                for row in rows
            ]
            reply = f"Students in Class {class_name}:\n" + "".join(reply_lines)
            return { 'reply': reply }
        else:
            return { 'reply': 'Please specify a class to view students. For example: "List students in class A"' }

    elif intent == "list_teachers_for_class":
        # List teachers in a specific class
        class_match = re.search(r'class\s*([a-zA-Z0-9]+)', user_message)
        if class_match:
            class_name = class_match.group(1).upper()
            conn = connect("teachers.db")
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM teachers")
            rows = cursor.fetchall()
            conn.close()
            filtered = []
            for row in rows:
                if row['classes']:
                    classes = [c.strip().upper() for c in row['classes'].split(',')]
                    if class_name in classes:
                        filtered.append(row)
            if not filtered:
                return { 'reply': f'No teachers found for class {class_name}.' }
            reply_lines = [
                f"ID: {row['teacher_id']}, Name: {row['name']}, Subject: {row['subject']}, Classes: {row['classes']}, Contact: {row['contact']}\n"
                for row in filtered
            ]
            reply = f"Teachers for Class {class_name}:\n" + "".join(reply_lines)
            return { 'reply': reply }
        else:
            return { 'reply': 'Please specify a class to view teachers. For example: "List teachers for class A"' }

    elif intent == "add_class":
        # Add a new class
        class_match = re.search(r'class\s*([a-zA-Z0-9]+)', user_message)
        if class_match:
            class_name = class_match.group(1).upper()
            try:
                conn = connect("classes.db")
                cursor = conn.cursor()
                cursor.execute("INSERT INTO classes (name) VALUES (?)", (class_name,))
                conn.commit()
                conn.close()
                return { 'reply': f"Class '{class_name}' added successfully!" }
            except Exception as e:
                return { 'reply': f"Error adding class '{class_name}': {str(e)}" }
        else:
            return { 'reply': 'Please specify a class name to add. For example: "Add class B"' }

    elif intent == "delete_student":
        # Delete a student
        student_match = re.search(r'student\s*([a-zA-Z0-9]+)', user_message)
        if student_match:
            student_id = student_match.group(1).upper()
            try:
                conn = connect("students.db")
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM students WHERE UPPER(student_id) = ?", (student_id,))
                student = cursor.fetchone()
                if not student:
                    conn.close()
                    return { 'reply': f"Student with ID {student_id} does not exist." }
                cursor.execute("DELETE FROM students WHERE UPPER(student_id) = ?", (student_id,))
                conn.commit()
                conn.close()
                return { 'reply': f"Student with ID {student_id} deleted successfully." }
            except Exception as e:
                return { 'reply': f"Error deleting student {student_id}: {str(e)}" }
        else:
            return { 'reply': 'Please specify a student ID to delete. For example: "Delete student S001"' }

    elif intent == "delete_teacher":
        # Delete a teacher
        teacher_match = re.search(r'teacher\s*([a-zA-Z0-9]+)', user_message)
        if teacher_match:
            teacher_id = teacher_match.group(1).upper()
            try:
                conn = connect("teachers.db")
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM teachers WHERE UPPER(teacher_id) = ?", (teacher_id,))
                teacher = cursor.fetchone()
                if not teacher:
                    conn.close()
                    return { 'reply': f"Teacher with ID {teacher_id} does not exist." }
                cursor.execute("DELETE FROM teachers WHERE UPPER(teacher_id) = ?", (teacher_id,))
                conn.commit()
                conn.close()
                return { 'reply': f"Teacher with ID {teacher_id} deleted successfully." }
            except Exception as e:
                return { 'reply': f"Error deleting teacher {teacher_id}: {str(e)}" }
        else:
            return { 'reply': 'Please specify a teacher ID to delete. For example: "Delete teacher T001"' }

    elif intent == "search_student":
        # Improved: Search for a student by ID or name (robust extraction)
        # Try to extract ID (alphanumeric) or name (words)
        id_match = re.search(r'(?:student\s*)?([a-zA-Z0-9]+)', user_message.replace('find ', '').replace('lookup ', '').replace('search for ', ''))
        name_match = re.search(r'(?:find|lookup|search for)\s+([a-zA-Z ]+)', user_message)
        found = False
        if id_match:
            candidate = id_match.group(1).strip()
            # If it's a likely ID (contains digits), search by ID
            if any(char.isdigit() for char in candidate):
                student_id = candidate.upper()
                conn = connect("students.db")
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM students WHERE UPPER(student_id) = ?", (student_id,))
                rows = cursor.fetchall()
                conn.close()
                if rows:
                    reply_lines = [
                        f"Student ID: {row['student_id']}, Name: {row['name']}, Class: {row['class_name']}, Contact: {row['contact']}, Grade: {row['grade']}\n\n"
                        for row in rows
                    ]
                    reply = f"Student(s) with ID {student_id}:\n" + "".join(reply_lines)
                    return { 'reply': reply }
                found = True
        if name_match and not found:
            name = name_match.group(1).strip()
            conn = connect("students.db")
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM students WHERE LOWER(name) = ?", (name.lower(),))
            rows = cursor.fetchall()
            conn.close()
            if rows:
                reply_lines = [
                    f"Student ID: {row['student_id']}, Name: {row['name']}, Class: {row['class_name']}, Contact: {row['contact']}, Grade: {row['grade']}\n\n"
                    for row in rows
                ]
                reply = f"Student(s) named {name}:\n" + "".join(reply_lines)
                return { 'reply': reply }
            found = True
        if not found:
            return { 'reply': 'Please specify a student ID or name to search. For example: "Find student S001" or "Search for John Doe"' }

    elif intent == "add_student":
        return { 'reply': 'It is recommended to add a new student manually via the web interface for accuracy and data validation.' }
    elif intent == "add_teacher":
        return { 'reply': 'It is recommended to add a new teacher manually via the web interface for accuracy and data validation.' }
    elif intent == "update_student":
        return { 'reply': 'It is recommended to update student information manually via the web interface for accuracy and data validation.' }
    elif intent == "update_teacher":
        return { 'reply': 'It is recommended to update teacher information manually via the web interface for accuracy and data validation.' }
    elif intent == "take_attendance":
        return { 'reply': 'It is recommended to take attendance manually via the web interface for accuracy and data validation.' }

    else:
        # Fallback: simple echo or default message
        return { 'reply': "I do not understand your request. Please try rephrasing your command."}