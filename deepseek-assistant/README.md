# DeepSeek Assistant

A personal DeepSeek AI coding assistant sidebar for VS Code.

## Features

- Chat sidebar pinned to the VS Code activity bar
- Conversation history within a session
- Configurable model (`deepseek-chat` or `deepseek-reasoner`) and temperature
- Code-block-friendly rendering that respects your theme

## Setup

1. Install the extension (from the VSIX or by running it from source).
2. Open VS Code Settings and set `deepseek.apiKey` to your DeepSeek API key.
3. Click the DeepSeek icon in the activity bar to open the chat.

## Commands

- `DeepSeek: Open Chat` — focus the chat sidebar
- `DeepSeek: Clear Conversation` — reset chat history

## Settings

- `deepseek.apiKey` — your DeepSeek API key
- `deepseek.model` — `deepseek-chat` (default) or `deepseek-reasoner`
- `deepseek.temperature` — sampling temperature (0–2, default 0.7)
