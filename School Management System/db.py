from sqlite3 import connect
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def init_db():
    conn = connect("users.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE,
            hashed_password TEXT
        )
    """)
    cursor.execute("SELECT * FROM admin WHERE username = ?", ("admin",))
    if not cursor.fetchone():
        hashed = pwd_context.hash("1234")  # password
        cursor.execute("INSERT INTO admin (username, hashed_password) VALUES (?, ?)", ("admin", hashed))
        conn.commit()
    conn.close()


def init_student_db():
    conn = connect("students.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            class_name TEXT NOT NULL,
            contact TEXT NOT NULL,
            grade TEXT
        )
    """)
    conn.commit()
    conn.close()
    
def init_teacher_db():
    conn = connect("teachers.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS teachers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            subject TEXT NOT NULL,
            contact TEXT NOT NULL,
            classes TEXT
        )
    """)
    conn.commit()
    conn.close()

def init_classes_db():
    conn = connect("classes.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def init_attendance_db():
    conn = connect("attendance.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT,
            date TEXT,
            status TEXT,
            class_name TEXT
        )
    """)
    conn.commit()
    conn.close()

