"""
ai.py — Google Gemini integration for food recognition
"""

import json
import re
import logging
from pathlib import Path

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# ─────────────────────────── System prompt ───────────────────────────

SYSTEM_PROMPT = """Ты профессиональный диетолог и нутрициолог.
Твоя задача — определить блюдо по фото или текстовому описанию и вернуть его калорийность.

Правила:
1. Верни ТОЛЬКО валидный JSON, без markdown, без пояснений.
2. Формат ответа:
   {"food": "Название блюда", "calories": 350, "protein": 25.0, "carbs": 40.0, "fat": 8.0, "emoji": "🍗"}
3. "calories" — целое число, ккал на порцию (стандартная порция ~250-400г).
4. "protein", "carbs", "fat" — граммы на порцию, число с плавающей точкой.
5. "emoji" — один эмодзи, лучше всего описывающий блюдо.
6. Если на изображении нет еды или текст не описывает еду — верни: null
7. Если описание неоднозначно, используй наиболее типичный рецепт."""


def _parse_ai_response(raw: str) -> dict | None:
    """Extract and parse JSON from AI response, strip markdown fences if any."""
    text = raw.strip()
    # Remove ```json ... ``` or ``` ... ```
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s*```$", "", text, flags=re.MULTILINE)
    text = text.strip()

    if text.lower() == "null":
        return None

    try:
        data = json.loads(text)
        if data is None:
            return None
        if not isinstance(data, dict) or "food" not in data or "calories" not in data:
            logger.warning("Unexpected AI JSON shape: %s", data)
            return None
        return data
    except json.JSONDecodeError as e:
        logger.error("JSON parse error: %s | raw: %s", e, raw[:300])
        return None


class FoodAI:
    def __init__(self, api_key: str, model: str = "gemini-2.5-flash-lite"):
        self.model = model
        self.client = genai.Client(api_key=api_key)

    # ── Text analysis ──────────────────────────────────────────────

    def analyze_text(self, text: str) -> dict | None:
        """
        Send a text description to Gemini and get food info.
        Returns dict with keys: food, calories, protein, carbs, fat, emoji
        Returns None if not food-related.
        """
        prompt = f"{SYSTEM_PROMPT}\n\nОпиши калорийность: {text}"
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=256,
                ),
            )
            raw = response.text or ""
            return _parse_ai_response(raw)
        except Exception as e:
            logger.error("Gemini text error: %s", e)
            raise

    # ── Photo analysis ─────────────────────────────────────────────

    def analyze_photo(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> dict | None:
        """
        Send an image to Gemini and get food info.
        Returns dict with keys: food, calories, protein, carbs, fat, emoji
        Returns None if the image doesn't contain food.
        """
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    SYSTEM_PROMPT,
                ],
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=256,
                ),
            )
            raw = response.text or ""
            return _parse_ai_response(raw)
        except Exception as e:
            logger.error("Gemini photo error: %s", e)
            raise
