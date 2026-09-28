from typing import AsyncGenerator, List, Dict, Optional
from app.config import settings
from app.providers import get_ai_provider

DEFAULT_SYSTEM_INSTRUCTION = (
    "You are SnapBot, a helpful AI assistant.\n\n"
    "Give accurate, concise, well-structured answers.\n\n"
    "Prefer:\n"
    "- short paragraphs\n"
    "- headings when useful\n"
    "- bullet points for lists\n"
    "- numbered steps for procedures\n"
    "- code blocks for code\n"
    "- examples when they improve understanding\n\n"
    "Do not unnecessarily repeat the user's question.\n\n"
    "For simple questions, answer directly.\n\n"
    "For complex questions, explain the answer step by step.\n\n"
    "Do not produce unnecessarily long responses."
)


class ChatService:
    def sanitize_and_prepare_messages(
        self,
        new_message: Optional[str] = None,
        messages: Optional[List[Dict[str, str]]] = None,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> List[Dict[str, str]]:
        """
        Consolidates new_message, messages, and history into a clean, bounded message array.
        Enforces maximum history length and per-message length limits to prevent abuse.
        """
        combined: List[Dict[str, str]] = []

        # 1. Add history if provided
        if history:
            for item in history:
                text = item.get("content", "").strip()
                if text:
                    role = item.get("role", "user")
                    combined.append({"role": role, "content": text[: settings.MAX_MESSAGE_LENGTH]})

        # 2. Add messages list if provided
        if messages:
            for item in messages:
                text = item.get("content", "").strip()
                if text:
                    role = item.get("role", "user")
                    combined.append({"role": role, "content": text[: settings.MAX_MESSAGE_LENGTH]})

        # 3. Add single new_message if provided and not duplicate of last message
        if new_message and new_message.strip():
            trimmed = new_message.strip()[: settings.MAX_MESSAGE_LENGTH]
            if not combined or combined[-1]["content"] != trimmed:
                combined.append({"role": "user", "content": trimmed})

        if not combined:
            raise ValueError("Message content cannot be empty.")

        # Keep only the most recent N messages
        if len(combined) > settings.MAX_HISTORY_LENGTH:
            combined = combined[-settings.MAX_HISTORY_LENGTH :]

        return combined

    async def stream_chat_response(
        self,
        sanitized_messages: List[Dict[str, str]],
        system_instruction: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        instruction = system_instruction or DEFAULT_SYSTEM_INSTRUCTION
        provider = get_ai_provider()
        async for chunk in provider.stream_chat(sanitized_messages, instruction):
            yield chunk

    async def generate_chat_response(
        self,
        sanitized_messages: List[Dict[str, str]],
        system_instruction: Optional[str] = None
    ) -> str:
        instruction = system_instruction or DEFAULT_SYSTEM_INSTRUCTION
        provider = get_ai_provider()
        return await provider.generate_response(sanitized_messages, instruction)


chat_service = ChatService()
