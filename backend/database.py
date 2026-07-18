"""
database.py — SQLite database layer for Calorie Tracker API
"""

from contextlib import contextmanager
import sqlite3
from datetime import date
from pathlib import Path

DB_PATH = Path(__file__).parent / "calorie_tracker.db"


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


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

            CREATE TABLE IF NOT EXISTS water_logs (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL,
                amount_ml   INTEGER NOT NULL,
                date        TEXT DEFAULT (date('now')),
                logged_at   TEXT DEFAULT (datetime('now', 'localtime')),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS weight_history (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL,
                weight      REAL NOT NULL,
                date        TEXT DEFAULT (date('now')),
                logged_at   TEXT DEFAULT (datetime('now', 'localtime')),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        """)
        
        # Add columns for streaks if they don't exist
        try:
            conn.execute("ALTER TABLE users ADD COLUMN current_streak INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE users ADD COLUMN last_active_date TEXT")
        except sqlite3.OperationalError:
            pass


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
    if weight is not None:
        add_weight_history(user_id, weight)
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


# ─────────────────────────── Water & Weight ───────────────────────────

def add_water(user_id: int, amount_ml: int) -> int:
    today = date.today().isoformat()
    with get_conn() as conn:
        cur = conn.execute("""
            INSERT INTO water_logs (user_id, amount_ml, date)
            VALUES (?, ?, ?)
        """, (user_id, amount_ml, today))
        return cur.lastrowid


def delete_water(log_id: int, user_id: int) -> bool:
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM water_logs WHERE id = ? AND user_id = ?", (log_id, user_id))
        return cur.rowcount > 0


def get_water_by_date(user_id: int, target_date: str) -> list[sqlite3.Row]:
    with get_conn() as conn:
        return conn.execute("""
            SELECT id, amount_ml, logged_at FROM water_logs
            WHERE user_id = ? AND date = ?
            ORDER BY logged_at DESC
        """, (user_id, target_date)).fetchall()


def add_weight_history(user_id: int, weight: float) -> None:
    today = date.today().isoformat()
    with get_conn() as conn:
        # Only add one record per day, update if exists
        existing = conn.execute("SELECT id FROM weight_history WHERE user_id = ? AND date = ?", (user_id, today)).fetchone()
        if existing:
            conn.execute("UPDATE weight_history SET weight = ? WHERE id = ?", (weight, existing['id']))
        else:
            conn.execute("INSERT INTO weight_history (user_id, weight, date) VALUES (?, ?, ?)", (user_id, weight, today))


def get_weight_history(user_id: int, limit: int = 30) -> list[sqlite3.Row]:
    with get_conn() as conn:
        return conn.execute("""
            SELECT weight, date FROM weight_history
            WHERE user_id = ?
            ORDER BY date DESC LIMIT ?
        """, (user_id, limit)).fetchall()


def update_user_streak(user_id: int) -> int:
    """Calculates and updates user streak based on consecutive days of food logs."""
    today = date.today().isoformat()
    with get_conn() as conn:
        user = conn.execute("SELECT last_active_date, current_streak FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user: return 0
        
        last_date = user['last_active_date']
        streak = user['current_streak'] or 0
        
        if last_date == today:
            return streak # Already updated today
            
        from datetime import datetime, timedelta
        if last_date:
            last_date_obj = datetime.fromisoformat(last_date).date()
            if last_date_obj == date.today() - timedelta(days=1):
                streak += 1
            else:
                streak = 1
        else:
            streak = 1
            
        conn.execute("UPDATE users SET last_active_date = ?, current_streak = ? WHERE id = ?", (today, streak, user_id))
        return streak
