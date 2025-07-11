from fastapi import FastAPI, Request, Form, HTTPException, Depends, Query, status
from starlette.middleware.sessions import SessionMiddleware
from sqlite3 import connect
from pydantic import BaseModel
from typing import List
from datetime import datetime
import db
import sqlite3
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
import re

app = FastAPI()

# Add session middleware
app.add_middleware(SessionMiddleware, secret_key="your-secret-key")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize databases
db.init_db()
db.init_student_db()
db.init_teacher_db()
db.init_classes_db()
db.init_attendance_db()
db.init_marks_db()
db.init_graduates_db()

def verify_user(username: str, password: str):
    conn = connect("users.db")
    cursor = conn.cursor()
    cursor.execute("SELECT hashed_password FROM admin WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return False
    return db.pwd_context.verify(password, row[0])

@app.get("/")
def read_root(request: Request):
    return RedirectResponse(url="/static/html/login.html")

@app.get("/dashboard")
def get_dashboard(request: Request):
    user = request.session.get("user")
    if not user:
        return RedirectResponse(url="/static/html/login.html")
    return RedirectResponse(url="/static/html/dashboard.html")

@app.post("/login")
async def login(request: Request, username: str = Form(...), password: str = Form(...)):
    if verify_user(username, password):
        request.session["user"] = username
        return {"message": "Login successful"}
    raise HTTPException(status_code=401, detail="Invalid username or password")

@app.post("/logout")
async def logout(request: Request):
    request.session.clear()
    return {"message": "Logged out"}

@app.get("/check-auth")
async def check_auth(request: Request):
    user = request.session.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"authenticated": True}

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
async def login(request: Request, username: str = Form(...), password: str = Form(...)):
    if verify_user(username, password):
        request.session["user"] = username
        return {"message": "Login successful"}
    raise HTTPException(status_code=401, detail="Invalid username or password")

@app.post("/logout")
async def logout(request: Request):
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

class TeacherUpdate(BaseModel):
    name: str = None
    subject: str = None
    classes: str = None
    contact: str = None

@app.post("/add-class")
def add_class(name: str, user: str = Depends(get_user)):
    # Validate class name format
    import re
    if not re.match(r'^[1-8]-[A-Z]$', name.upper()):
        raise HTTPException(status_code=400, detail="Class name must be in the format '1-A' to '8-Z'")

    conn = connect("classes.db")
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO classes (name) VALUES (?)", (name.upper(),))
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Class already exists")
    finally:
        conn.close()
    return {"message": f"Class '{name.upper()}' added."}

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
        "INSERT INTO students (student_id, name, class_name, contact) VALUES (?, ?, ?, ?)",
        (student.student_id.upper(), student.name, student.class_name.upper(), student.contact)
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

    # Check if teacher exists
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
    if teacher.classes is not None:  # Check if classes field was provided, even if empty
        update_fields.append("classes = ?")
        values.append(teacher.classes.upper() if teacher.classes else "")  # Handle empty string case
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

class MarksEntry(BaseModel):
    student_id: str
    class_name: str
    subject: str
    marks: int
    exam_type: str

    @property
    def grade(self) -> str:
        return db.calculate_grade(self.marks)

@app.post("/add-marks", status_code=status.HTTP_201_CREATED)
def add_marks(entry: MarksEntry, user: str = Depends(get_user)):
    if entry.marks < 0 or entry.marks > 100:
        raise HTTPException(status_code=400, detail="Marks must be between 0 and 100")
    
    if entry.exam_type.upper() not in ['MID', 'FINAL']:
        raise HTTPException(status_code=400, detail="Exam type must be either MID or FINAL")

    # Convert exam_type to uppercase for consistency
    entry.exam_type = entry.exam_type.upper()

    conn = sqlite3.connect("marks.db")
    cursor = conn.cursor()
    
    # Check if student exists and belongs to the specified class
    student_conn = sqlite3.connect("students.db")
    student_cursor = student_conn.cursor()
    student_cursor.execute(
        "SELECT * FROM students WHERE student_id = ? AND class_name = ?", 
        (entry.student_id.upper(), entry.class_name.upper())
    )
    student = student_cursor.fetchone()
    student_conn.close()
    
    if not student:
        conn.close()
        raise HTTPException(status_code=404, detail="Student not found in the specified class")

    # Check if marks already exist for this student, class, subject and exam type
    cursor.execute("""
        SELECT id FROM marks 
        WHERE student_id = ? AND class_name = ? AND subject = ? AND UPPER(exam_type) = ?
    """, (entry.student_id.upper(), entry.class_name.upper(), entry.subject.upper(), entry.exam_type))
    existing = cursor.fetchone()

    if existing:
        # Update existing marks
        cursor.execute("""
            UPDATE marks SET marks = ?, grade = ? WHERE id = ?
        """, (entry.marks, entry.grade, existing[0]))
    else:
        # Insert new marks
        cursor.execute("""
            INSERT INTO marks (student_id, class_name, subject, marks, exam_type, grade) 
            VALUES (?, ?, ?, ?, ?, ?)
        """, (entry.student_id.upper(), entry.class_name.upper(), entry.subject.upper(), 
              entry.marks, entry.exam_type, entry.grade))

    conn.commit()
    conn.close()
    return {"message": "Marks recorded successfully", "grade": entry.grade}

@app.get("/get-marks/{student_id}")
def get_marks(
    student_id: str,
    class_name: str,
    exam_type: str = Query(..., description="Exam type (MID/FINAL)"),
    user: str = Depends(get_user)
):
    exam_type = exam_type.upper()
    if exam_type not in ['MID', 'FINAL']:
        raise HTTPException(status_code=400, detail="Exam type must be either MID or FINAL")

    # Validate that the class exists
    conn_classes = connect("classes.db")
    cursor_classes = conn_classes.cursor()
    cursor_classes.execute("SELECT name FROM classes WHERE UPPER(name) = UPPER(?)", (class_name,))
    class_exists = cursor_classes.fetchone()
    conn_classes.close()

    if not class_exists:
        return {
            "student_id": student_id.upper(),
            "class_name": class_name.upper(),
            "exam_type": exam_type,
            "message": f"Class {class_name} does not exist"
        }

    conn = sqlite3.connect("marks.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Use parameterized query with exact class name match
    cursor.execute("""
        SELECT subject, marks, grade 
        FROM marks 
        WHERE UPPER(student_id) = UPPER(?) 
        AND UPPER(class_name) = UPPER(?) 
        AND UPPER(exam_type) = UPPER(?)
        ORDER BY subject
    """, (student_id, class_name, exam_type))
    
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return {
            "student_id": student_id.upper(),
            "class_name": class_name.upper(),
            "exam_type": exam_type,
            "message": f"No {exam_type} marks found for this student in class {class_name}"
        }
    
    total_marks = 0
    marks_list = []
    
    for row in rows:
        marks_list.append({
            "subject": row["subject"],
            "marks": row["marks"],
            "grade": row["grade"]
        })
        total_marks += row["marks"]
    
    num_subjects = len(marks_list)
    percentage = (total_marks / (num_subjects * 100)) * 100
    overall_grade = db.calculate_grade(percentage)
    
    # Get student name
    conn = sqlite3.connect("students.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM students WHERE UPPER(student_id) = UPPER(?)", (student_id,))
    student = cursor.fetchone()
    
    # If student not found in current students, check graduates
    if not student:
        conn.close()
        conn = sqlite3.connect("graduates.db")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM graduates WHERE UPPER(student_id) = UPPER(?)", (student_id,))
        student = cursor.fetchone()
    
    conn.close()
    student_name = student["name"] if student else "Unknown Student"
    
    return {
        "student_id": student_id.upper(),
        "student_name": student_name,
        "class_name": class_name.upper(),
        "exam_type": exam_type,
        "subjects": marks_list,
        "total_marks": total_marks,
        "total_subjects": num_subjects,
        "percentage": round(percentage, 2),
        "overall_grade": overall_grade
    }

@app.get("/get-student-classes/{student_id}")
def get_student_classes(student_id: str, user: str = Depends(get_user)):
    """Get all classes a student has been in, including current class"""
    conn = sqlite3.connect("marks.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get distinct classes from marks table
    cursor.execute("""
        SELECT DISTINCT class_name 
        FROM marks 
        WHERE UPPER(student_id) = UPPER(?)
        ORDER BY class_name
    """, (student_id,))
    
    past_classes = [row["class_name"] for row in cursor.fetchall()]
    conn.close()
    
    # Get current class
    conn = sqlite3.connect("students.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT class_name 
        FROM students 
        WHERE UPPER(student_id) = UPPER(?)
    """, (student_id,))
    
    current = cursor.fetchone()
    current_class = current["class_name"] if current else None
    conn.close()
    
    # Combine and remove duplicates while preserving order
    all_classes = []
    if current_class and current_class not in past_classes:
        all_classes.append(current_class)
    all_classes.extend(past_classes)
    
    return {"classes": all_classes}

@app.get("/get-student-total/{student_id}")
def get_student_total(student_id: str, class_name: str, user: str = Depends(get_user)):
    conn = sqlite3.connect("marks.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get all marks for both MID and FINAL exams
    cursor.execute("""
        SELECT subject, marks, UPPER(exam_type) as exam_type
        FROM marks 
        WHERE student_id = ? AND class_name = ?
        ORDER BY subject, exam_type
    """, (student_id.upper(), class_name.upper()))
    
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return {
            "message": f"No marks found for student {student_id} in class {class_name}"
        }
    
    # Process marks by subject
    subjects = {}
    for row in rows:
        subject = row["subject"]
        if subject not in subjects:
            subjects[subject] = {"mid": None, "final": None}
        
        if row["exam_type"] == "MID":
            subjects[subject]["mid"] = row["marks"]
        else:
            subjects[subject]["final"] = row["marks"]
    
    # Calculate weighted totals
    result = {
        "student_id": student_id.upper(),
        "class_name": class_name.upper(),
        "subjects": [],
        "total_marks": 0,
        "total_possible": 0,
        "percentage": 0,
        "grade": None
    }
    
    # Calculate subject-wise totals
    for subject, marks in subjects.items():
        if marks["mid"] is not None and marks["final"] is not None:
            weighted_total = round((marks["mid"] * 0.3) + (marks["final"] * 0.7), 2)
            result["subjects"].append({
                "subject": subject,
                "total_marks": weighted_total,
                "grade": db.calculate_grade(weighted_total)
            })
            result["total_marks"] += weighted_total
            result["total_possible"] += 100
    
    # Calculate overall percentage and grade
    if result["total_possible"] > 0:
        result["percentage"] = round((result["total_marks"] / result["total_possible"]) * 100, 2)
        result["grade"] = db.calculate_grade(result["percentage"])
    
    return result

def get_next_class(current_class: str) -> str:
    """Helper function to get the next class name"""
    match = re.match(r'(\d+)-([A-Z])', current_class)
    if not match:
        raise ValueError(f"Invalid class format: {current_class}")
    
    grade, section = match.groups()
    next_grade = int(grade) + 1
    if next_grade > 8:
        return None
    return f"{next_grade}-{section}"

@app.post("/promote-students")
async def promote_students(user: str = Depends(get_user)):
    conn_students = connect("students.db")
    conn_students.row_factory = sqlite3.Row
    cursor_students = conn_students.cursor()
    
    # Get all students grouped by class
    cursor_students.execute("SELECT DISTINCT class_name FROM students ORDER BY class_name")
    classes = [row['class_name'] for row in cursor_students.fetchall()]
    
    promoted_count = 0
    graduated_count = 0
    retained_count = 0
    current_year = datetime.now().year
    
    for class_name in classes:
        # Get all students in current class
        cursor_students.execute("""
            SELECT s.student_id, s.name, s.contact, s.class_name
            FROM students s
            WHERE s.class_name = ?
        """, (class_name,))
        students = cursor_students.fetchall()
        
        for student in students:
            # Calculate overall marks for the student
            conn_marks = connect("marks.db")
            cursor_marks = conn_marks.cursor()
            cursor_marks.execute("""
                SELECT subject, marks, exam_type
                FROM marks 
                WHERE student_id = ? AND class_name = ?
            """, (student['student_id'], class_name))
            marks_data = cursor_marks.fetchall()
            conn_marks.close()
            
            if not marks_data:
                continue  # Skip students with no marks
                
            # Calculate weighted average (30% mid, 70% final)
            subjects = {}
            for subject, marks, exam_type in marks_data:
                if subject not in subjects:
                    subjects[subject] = {'mid': None, 'final': None}
                if exam_type.upper() == 'MID':
                    subjects[subject]['mid'] = marks
                else:
                    subjects[subject]['final'] = marks
            
            total_weighted_marks = 0
            subject_count = 0
            
            for subject_marks in subjects.values():
                if subject_marks['mid'] is not None and subject_marks['final'] is not None:
                    weighted_mark = (subject_marks['mid'] * 0.3) + (subject_marks['final'] * 0.7)
                    total_weighted_marks += weighted_mark
                    subject_count += 1
            
            if subject_count == 0:
                continue  # Skip if no complete subject marks
                
            overall_percentage = (total_weighted_marks / (subject_count * 100)) * 100
            
            if overall_percentage >= 50:
                next_class = get_next_class(class_name)
                
                if next_class is None:  # Student has completed grade 8
                    # Move to graduates table
                    conn_graduates = connect("graduates.db")
                    cursor_graduates = conn_graduates.cursor()
                    
                    try:
                        cursor_graduates.execute("""
                            INSERT INTO graduates (student_id, name, overall_marks, contact, graduation_year)
                            VALUES (?, ?, ?, ?, ?)
                        """, (
                            student['student_id'],
                            student['name'],
                            overall_percentage,
                            student['contact'],
                            current_year
                        ))
                        conn_graduates.commit()
                        
                        # Remove from students table
                        cursor_students.execute("DELETE FROM students WHERE student_id = ?", 
                                             (student['student_id'],))
                        graduated_count += 1
                    except sqlite3.IntegrityError:
                        pass  # Skip if already in graduates table
                    finally:
                        conn_graduates.close()
                else:
                    # Update student's class
                    cursor_students.execute("""
                        UPDATE students 
                        SET class_name = ?
                        WHERE student_id = ?
                    """, (next_class, student['student_id']))
                    promoted_count += 1
            else:
                retained_count += 1
    
    conn_students.commit()
    conn_students.close()
    
    return {
        "message": "Student promotion process completed",
        "promoted": promoted_count,
        "graduated": graduated_count,
        "retained": retained_count
    }

@app.get("/teachers-in-class")
def get_teachers_in_class(class_name: str, user: str = Depends(get_user)):
    conn = connect("teachers.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Find teachers who teach this class (case-insensitive)
    cursor.execute("""
        SELECT * FROM teachers 
        WHERE UPPER(classes) LIKE ?
    """, (f'%{class_name.upper()}%',))
    
    teachers = cursor.fetchall()
    conn.close()

    # Check if class exists
    class_conn = connect("classes.db")
    class_cursor = class_conn.cursor()
    class_cursor.execute("SELECT * FROM classes WHERE UPPER(name) = UPPER(?)", (class_name,))
    class_exists = class_cursor.fetchone()
    class_conn.close()

    if not class_exists:
        raise HTTPException(status_code=404, detail="Class not found.")

    result = []
    for row in teachers:
        result.append({
            "teacher_id": row["teacher_id"],
            "name": row["name"],
            "subject": row["subject"],
            "contact": row["contact"],
        })
    return {"teachers": result}

@app.get("/get-student-grade/{student_id}")
def get_student_grade(student_id: str, user: str = Depends(get_user)):
    conn = sqlite3.connect("marks.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get all marks for both MID and FINAL exams
    cursor.execute("""
        SELECT subject, marks, UPPER(exam_type) as exam_type
        FROM marks 
        WHERE student_id = ?
        ORDER BY subject, exam_type
    """, (student_id.upper(),))
    
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return {"grade": "N/A"}
    
    # Process marks by subject
    subjects = {}
    for row in rows:
        subject = row["subject"]
        if subject not in subjects:
            subjects[subject] = {"mid": None, "final": None}
        
        if row["exam_type"] == "MID":
            subjects[subject]["mid"] = row["marks"]
        else:
            subjects[subject]["final"] = row["marks"]
    
    # Calculate weighted total
    total_weighted_marks = 0
    subject_count = 0
    
    for subject_marks in subjects.values():
        if subject_marks["mid"] is not None and subject_marks["final"] is not None:
            weighted_total = (subject_marks["mid"] * 0.3) + (subject_marks["final"] * 0.7)
            total_weighted_marks += weighted_total
            subject_count += 1
    
    if subject_count == 0:
        return {"grade": "N/A"}
        
    overall_percentage = (total_weighted_marks / (subject_count * 100)) * 100
    grade = db.calculate_grade(overall_percentage)
    
    return {
        "grade": grade,
        "percentage": round(overall_percentage, 2)
    }

@app.get("/get-graduates")
def get_graduates(user: str = Depends(get_user)):
    conn = connect("graduates.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM graduates ORDER BY graduation_year DESC, overall_marks DESC")
    rows = cursor.fetchall()
    conn.close()

    graduates = []
    for row in rows:
        graduates.append({
            "student_id": row["student_id"],
            "name": row["name"],
            "overall_marks": row["overall_marks"],
            "contact": row["contact"],
            "graduation_year": row["graduation_year"]
        })

    return {"graduates": graduates}