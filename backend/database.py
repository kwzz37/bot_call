"""
database.py — SQLite database layer for Calorie Tracker API
"""

import sqlite3
from datetime import date
from pathlib import Path

DB_PATH = Path(__file__).parent / "calorie_tracker.db"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ─────────────────────────── Schema ───────────────────────────

def init_db() -> None:
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id          INTEGER PRIMARY KEY,   -- Telegram user_id
                calorie_goal INTEGER NOT NULL DEFAULT 2500,
                weight      REAL,
                height      REAL,
                age         INTEGER,
                gender      TEXT,
                activity    REAL DEFAULT 1.2,
                first_name  TEXT,
                username    TEXT,
                created_at  TEXT DEFAULT (date('now'))
            );

            CREATE TABLE IF NOT EXISTS food_logs (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL,
                food_name   TEXT    NOT NULL,
                calories    INTEGER NOT NULL,
                protein     REAL,
                carbs       REAL,
                fat         REAL,
                emoji       TEXT,
                source      TEXT DEFAULT 'manual',  -- 'manual' | 'text_ai' | 'photo_ai'
                logged_at   TEXT DEFAULT (datetime('now', 'localtime')),
                date        TEXT DEFAULT (date('now')),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        """)


# ─────────────────────────── Users ───────────────────────────

def get_user(user_id: int) -> sqlite3.Row | None:
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM users WHERE id = ?", (user_id,)
        ).fetchone()


def upsert_user(
    user_id: int,
    *,
    calorie_goal: int = 2500,
    weight: float | None = None,
    height: float | None = None,
    age: int | None = None,
    gender: str | None = None,
    activity: float = 1.2,
    first_name: str | None = None,
    username: str | None = None,
) -> sqlite3.Row:
    """Create or update a user record. Returns the final row."""
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO users (id, calorie_goal, weight, height, age, gender, activity, first_name, username)
            VALUES (:id, :calorie_goal, :weight, :height, :age, :gender, :activity, :first_name, :username)
            ON CONFLICT(id) DO UPDATE SET
                calorie_goal = COALESCE(:calorie_goal, calorie_goal),
                weight       = COALESCE(:weight, weight),
                height       = COALESCE(:height, height),
                age          = COALESCE(:age, age),
                gender       = COALESCE(:gender, gender),
                activity     = COALESCE(:activity, activity),
                first_name   = COALESCE(:first_name, first_name),
                username     = COALESCE(:username, username)
        """, {
            "id": user_id, "calorie_goal": calorie_goal,
            "weight": weight, "height": height, "age": age,
            "gender": gender, "activity": activity,
            "first_name": first_name, "username": username,
        })
    return get_user(user_id)


# ─────────────────────────── Food logs ───────────────────────────

def add_food_log(
    user_id: int,
    food_name: str,
    calories: int,
    *,
    protein: float | None = None,
    carbs: float | None = None,
    fat: float | None = None,
    emoji: str | None = None,
    source: str = "manual",
) -> int:
    """Insert a food entry. Returns the new row id."""
    today = date.today().isoformat()
    with get_conn() as conn:
        cur = conn.execute("""
            INSERT INTO food_logs (user_id, food_name, calories, protein, carbs, fat, emoji, source, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, food_name, calories, protein, carbs, fat, emoji, source, today))
        return cur.lastrowid


def delete_food_log(log_id: int, user_id: int) -> bool:
    """Delete a food log entry. user_id guard prevents cross-user deletion."""
    with get_conn() as conn:
        cur = conn.execute(
            "DELETE FROM food_logs WHERE id = ? AND user_id = ?", (log_id, user_id)
        )
        return cur.rowcount > 0


def get_today_logs(user_id: int) -> list[sqlite3.Row]:
    today = date.today().isoformat()
    with get_conn() as conn:
        return conn.execute("""
            SELECT id, food_name, calories, protein, carbs, fat, emoji, source, logged_at
            FROM food_logs
            WHERE user_id = ? AND date = ?
            ORDER BY logged_at DESC
        """, (user_id, today)).fetchall()


def get_logs_by_date(user_id: int, target_date: str) -> list[sqlite3.Row]:
    with get_conn() as conn:
        return conn.execute("""
            SELECT id, food_name, calories, protein, carbs, fat, emoji, source, logged_at
            FROM food_logs
            WHERE user_id = ? AND date = ?
            ORDER BY logged_at DESC
        """, (user_id, target_date)).fetchall()
