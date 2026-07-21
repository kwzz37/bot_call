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
                id              INTEGER PRIMARY KEY,   -- Telegram user_id
                calorie_goal    INTEGER NOT NULL DEFAULT 2000,
                protein_goal    REAL    DEFAULT 120,
                carbs_goal      REAL    DEFAULT 200,
                fat_goal        REAL    DEFAULT 55,
                weight          REAL,
                height          REAL,
                age             INTEGER,
                gender          TEXT    DEFAULT 'male',
                goal_type       TEXT    DEFAULT 'maintain',  -- 'lose' | 'maintain' | 'gain'
                activity_level  TEXT    DEFAULT 'light',     -- 'sedentary'|'light'|'moderate'|'active'|'very_active'
                water_goal      INTEGER DEFAULT 2000,
                setup_complete  INTEGER DEFAULT 0,            -- 1 = onboarding done
                first_name      TEXT,
                username        TEXT,
                created_at      TEXT    DEFAULT (date('now')),
                last_active_date TEXT,
                current_streak  INTEGER DEFAULT 0
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
                source      TEXT DEFAULT 'manual',
                meal_type   TEXT DEFAULT 'any',
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

            CREATE TABLE IF NOT EXISTS custom_foods (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL,
                food_name   TEXT NOT NULL,
                calories    REAL NOT NULL,
                protein     REAL NOT NULL,
                carbs       REAL NOT NULL,
                fat         REAL NOT NULL,
                created_at  TEXT DEFAULT (datetime('now', 'localtime')),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS favorites (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL,
                food_name   TEXT NOT NULL,
                calories    REAL NOT NULL,
                protein     REAL DEFAULT 0,
                carbs       REAL DEFAULT 0,
                fat         REAL DEFAULT 0,
                emoji       TEXT DEFAULT '🍽️',
                created_at  TEXT DEFAULT (datetime('now', 'localtime')),
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, food_name)
            );
        """)

        # ── Migrations (safe ALTER TABLE) ──────────────────────────────
        _safe_add_column(conn, "users", "protein_goal", "REAL DEFAULT 120")
        _safe_add_column(conn, "users", "carbs_goal",   "REAL DEFAULT 200")
        _safe_add_column(conn, "users", "fat_goal",     "REAL DEFAULT 55")
        _safe_add_column(conn, "users", "goal_type",    "TEXT DEFAULT 'maintain'")
        _safe_add_column(conn, "users", "activity_level","TEXT DEFAULT 'light'")
        _safe_add_column(conn, "users", "water_goal",   "INTEGER DEFAULT 2000")
        _safe_add_column(conn, "users", "setup_complete","INTEGER DEFAULT 0")
        _safe_add_column(conn, "users", "gender",       "TEXT DEFAULT 'male'")
        _safe_add_column(conn, "users", "activity",     "REAL DEFAULT 1.375")
        _safe_add_column(conn, "users", "current_streak","INTEGER DEFAULT 0")
        _safe_add_column(conn, "users", "last_active_date","TEXT")
        _safe_add_column(conn, "food_logs", "meal_type", "TEXT DEFAULT 'any'")


def _safe_add_column(conn, table: str, column: str, col_def: str) -> None:
    try:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_def}")
    except sqlite3.OperationalError:
        pass  # Column already exists


# ─────────────────────────── TDEE / Goals Calculator ──────────────────

ACTIVITY_MULTIPLIERS = {
    "sedentary":   1.2,    # Мало / совсем не двигаюсь
    "light":       1.375,  # Лёгкая активность (1-3 раза в нед)
    "moderate":    1.55,   # Умеренная (3-5 раз в нед)
    "active":      1.725,  # Высокая (6-7 раз в нед)
    "very_active": 1.9,    # Очень высокая (2 раза в день)
}

GOAL_ADJUSTMENTS = {
    "lose":     -500,   # Дефицит для похудения (~0.5 кг/нед)
    "maintain": 0,
    "gain":     +300,   # Профицит для набора
}


def calculate_goals(
    weight: float,
    height: float,
    age: int,
    gender: str,
    activity_level: str,
    goal_type: str,
) -> dict:
    """
    Mifflin-St Jeor BMR → TDEE → target calories & macros.
    Returns dict with calorie_goal, protein_goal, carbs_goal, fat_goal, tdee, bmr.
    """
    if gender == "female":
        bmr = 10 * weight + 6.25 * height - 5 * age - 161
    else:
        bmr = 10 * weight + 6.25 * height - 5 * age + 5

    multiplier = ACTIVITY_MULTIPLIERS.get(activity_level, 1.375)
    tdee = round(bmr * multiplier)
    adjustment = GOAL_ADJUSTMENTS.get(goal_type, 0)
    calorie_goal = max(1200, tdee + adjustment)

    # Macro split: Protein 25-30% / Carbs 45-50% / Fat 25-30%
    protein_goal = round(weight * 1.8 if goal_type == "gain" else weight * 1.6)  # г/кг веса
    fat_goal = round((calorie_goal * 0.27) / 9)
    carbs_goal = round((calorie_goal - protein_goal * 4 - fat_goal * 9) / 4)
    carbs_goal = max(50, carbs_goal)

    return {
        "bmr": round(bmr),
        "tdee": tdee,
        "calorie_goal": calorie_goal,
        "protein_goal": protein_goal,
        "carbs_goal": carbs_goal,
        "fat_goal": fat_goal,
    }


# ─────────────────────────── Users ───────────────────────────

def get_user(user_id: int) -> sqlite3.Row | None:
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM users WHERE id = ?", (user_id,)
        ).fetchone()


def upsert_user(
    user_id: int,
    *,
    calorie_goal: int | None = None,
    protein_goal: float | None = None,
    carbs_goal: float | None = None,
    fat_goal: float | None = None,
    weight: float | None = None,
    height: float | None = None,
    age: int | None = None,
    gender: str | None = None,
    goal_type: str | None = None,
    activity_level: str | None = None,
    water_goal: int | None = None,
    setup_complete: int | None = None,
    first_name: str | None = None,
    username: str | None = None,
) -> sqlite3.Row:
    """Create or update a user record. Returns the final row."""
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO users (id, calorie_goal, protein_goal, carbs_goal, fat_goal,
                               weight, height, age, gender, goal_type, activity_level,
                               water_goal, setup_complete, first_name, username)
            VALUES (:id, COALESCE(:calorie_goal, 2000), :protein_goal, :carbs_goal, :fat_goal,
                    :weight, :height, :age, :gender, :goal_type, :activity_level,
                    :water_goal, :setup_complete, :first_name, :username)
            ON CONFLICT(id) DO UPDATE SET
                calorie_goal    = COALESCE(:calorie_goal, calorie_goal),
                protein_goal    = COALESCE(:protein_goal, protein_goal),
                carbs_goal      = COALESCE(:carbs_goal, carbs_goal),
                fat_goal        = COALESCE(:fat_goal, fat_goal),
                weight          = COALESCE(:weight, weight),
                height          = COALESCE(:height, height),
                age             = COALESCE(:age, age),
                gender          = COALESCE(:gender, gender),
                goal_type       = COALESCE(:goal_type, goal_type),
                activity_level  = COALESCE(:activity_level, activity_level),
                water_goal      = COALESCE(:water_goal, water_goal),
                setup_complete  = COALESCE(:setup_complete, setup_complete),
                first_name      = COALESCE(:first_name, first_name),
                username        = COALESCE(:username, username)
        """, {
            "id": user_id,
            "calorie_goal": calorie_goal,
            "protein_goal": protein_goal,
            "carbs_goal": carbs_goal,
            "fat_goal": fat_goal,
            "weight": weight,
            "height": height,
            "age": age,
            "gender": gender,
            "goal_type": goal_type,
            "activity_level": activity_level,
            "water_goal": water_goal,
            "setup_complete": setup_complete,
            "first_name": first_name,
            "username": username,
        })

    if weight is not None:
        add_weight_history(user_id, weight)

    return get_user(user_id)


def complete_onboarding(
    user_id: int,
    weight: float,
    height: float,
    age: int,
    gender: str,
    goal_type: str,
    activity_level: str,
) -> dict:
    """Run onboarding: calculate goals, save to DB, return calculated values."""
    goals = calculate_goals(weight, height, age, gender, activity_level, goal_type)
    upsert_user(
        user_id,
        calorie_goal=goals["calorie_goal"],
        protein_goal=goals["protein_goal"],
        carbs_goal=goals["carbs_goal"],
        fat_goal=goals["fat_goal"],
        weight=weight,
        height=height,
        age=age,
        gender=gender,
        goal_type=goal_type,
        activity_level=activity_level,
        water_goal=2000,
        setup_complete=1,
    )
    return goals


# ─────────────────────────── Favorites ───────────────────────────

def add_favorite(user_id: int, food_name: str, calories: float, protein: float,
                 carbs: float, fat: float, emoji: str = "🍽️") -> int:
    with get_conn() as conn:
        cur = conn.execute("""
            INSERT OR REPLACE INTO favorites (user_id, food_name, calories, protein, carbs, fat, emoji)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (user_id, food_name, calories, protein, carbs, fat, emoji))
        return cur.lastrowid


def remove_favorite(favorite_id: int, user_id: int) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "DELETE FROM favorites WHERE id = ? AND user_id = ?",
            (favorite_id, user_id)
        )
        return cur.rowcount > 0


def get_favorites(user_id: int) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT id, food_name, calories, protein, carbs, fat, emoji
            FROM favorites WHERE user_id = ?
            ORDER BY created_at DESC
        """, (user_id,)).fetchall()
        return [dict(r) for r in rows]


def is_favorite(user_id: int, food_name: str) -> int | None:
    """Returns favorite id if exists, else None."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id FROM favorites WHERE user_id = ? AND food_name = ?",
            (user_id, food_name)
        ).fetchone()
        return row["id"] if row else None


# ─────────────────────────── Food logs ───────────────────────────

def add_custom_food(user_id: int, food_name: str, calories: float,
                    protein: float, carbs: float, fat: float) -> int:
    with get_conn() as conn:
        cur = conn.execute("""
            INSERT INTO custom_foods (user_id, food_name, calories, protein, carbs, fat)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (user_id, food_name, calories, protein, carbs, fat))
        return cur.lastrowid


def add_food_log(
    user_id: int,
    food_name: str,
    calories: int,
    protein: float | None = None,
    carbs: float | None = None,
    fat: float | None = None,
    emoji: str | None = None,
    source: str = 'manual',
    meal_type: str = 'any',
    log_date: str | None = None
) -> int:
    with get_conn() as conn:
        actual_date = log_date or date.today().isoformat()
        cur = conn.execute(
            """
            INSERT INTO food_logs (user_id, food_name, calories, protein, carbs, fat, emoji, source, meal_type, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, food_name, calories, protein, carbs, fat, emoji, source, meal_type, actual_date)
        )
        return cur.lastrowid


def delete_food_log(log_id: int, user_id: int) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "DELETE FROM food_logs WHERE id = ? AND user_id = ?", (log_id, user_id)
        )
        return cur.rowcount > 0


def get_today_logs(user_id: int) -> list[sqlite3.Row]:
    today = date.today().isoformat()
    with get_conn() as conn:
        return conn.execute("""
            SELECT id, food_name, calories, protein, carbs, fat, emoji, source, meal_type, logged_at
            FROM food_logs
            WHERE user_id = ? AND date = ?
            ORDER BY logged_at DESC
        """, (user_id, today)).fetchall()


def get_logs_by_date(user_id: int, target_date: str) -> list[sqlite3.Row]:
    with get_conn() as conn:
        return conn.execute("""
            SELECT id, food_name, calories, protein, carbs, fat, emoji, source, meal_type, logged_at
            FROM food_logs
            WHERE user_id = ? AND date = ?
            ORDER BY logged_at DESC
        """, (user_id, target_date)).fetchall()


def get_logs_by_date_range(user_id: int, start_date: str, end_date: str) -> list[sqlite3.Row]:
    with get_conn() as conn:
        return conn.execute("""
            SELECT id, food_name, calories, protein, carbs, fat, emoji, source, meal_type, date, logged_at
            FROM food_logs
            WHERE user_id = ? AND date >= ? AND date <= ?
            ORDER BY date DESC, logged_at DESC
        """, (user_id, start_date, end_date)).fetchall()


def get_recent_foods(user_id: int, limit: int = 20) -> list[sqlite3.Row]:
    with get_conn() as conn:
        return conn.execute("""
            SELECT food_name, calories, protein, carbs, fat, emoji, MAX(logged_at) as last_logged
            FROM food_logs
            WHERE user_id = ?
            GROUP BY food_name
            ORDER BY last_logged DESC
            LIMIT ?
        """, (user_id, limit)).fetchall()


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
        existing = conn.execute(
            "SELECT id FROM weight_history WHERE user_id = ? AND date = ?",
            (user_id, today)
        ).fetchone()
        if existing:
            conn.execute("UPDATE weight_history SET weight = ? WHERE id = ?", (weight, existing['id']))
        else:
            conn.execute(
                "INSERT INTO weight_history (user_id, weight, date) VALUES (?, ?, ?)",
                (user_id, weight, today)
            )


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
        user = conn.execute(
            "SELECT last_active_date, current_streak FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()
        if not user:
            return 0

        last_date = user['last_active_date']
        streak = user['current_streak'] or 0

        if last_date == today:
            return streak

        from datetime import datetime, timedelta
        if last_date:
            last_date_obj = datetime.fromisoformat(last_date).date()
            if last_date_obj == date.today() - timedelta(days=1):
                streak += 1
            else:
                streak = 1
        else:
            streak = 1

        conn.execute(
            "UPDATE users SET last_active_date = ?, current_streak = ? WHERE id = ?",
            (today, streak, user_id)
        )
        return streak


def search_custom_foods(query: str, limit: int = 10) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT * FROM custom_foods
            WHERE food_name LIKE ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (f"%{query}%", limit)
        ).fetchall()
        return [dict(row) for row in rows]
