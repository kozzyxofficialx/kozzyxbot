import * as vscode from 'vscode';
import axios from 'axios';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export class DeepseekViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'deepseekChatView';
    private _view?: vscode.WebviewView;
    private history: ChatMessage[] = [];

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this.getHtml(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage': {
                    const userMessage: string = data.value;
                    this.history.push({ role: 'user', content: userMessage });
                    webviewView.webview.postMessage({ type: 'thinking' });
                    const reply = await this.callDeepSeekAPI();
                    if (reply !== null) {
                        this.history.push({ role: 'assistant', content: reply });
                        webviewView.webview.postMessage({ type: 'response', value: reply });
                    } else {
                        webviewView.webview.postMessage({ type: 'error', value: 'Request failed. See notification.' });
                    }
                    break;
                }
                case 'clear': {
                    this.clearConversation();
                    break;
                }
            }
        });
    }

    public clearConversation() {
        this.history = [];
        this._view?.webview.postMessage({ type: 'cleared' });
    }

    private async callDeepSeekAPI(): Promise<string | null> {
        const config = vscode.workspace.getConfiguration('deepseek');
        const apiKey = config.get<string>('apiKey');
        const model = config.get<string>('model') || 'deepseek-chat';
        const temperature = config.get<number>('temperature') ?? 0.7;

        if (!apiKey) {
            vscode.window.showErrorMessage('DeepSeek API key not set. Add "deepseek.apiKey" in Settings.');
            return null;
        }

        const systemPrompt: ChatMessage = {
            role: 'system',
            content: 'You are a helpful, concise coding assistant embedded in VS Code. Prefer code blocks with language tags. Keep explanations short.'
        };

        try {
            const response = await axios.post(
                'https://api.deepseek.com/v1/chat/completions',
                {
                    model,
                    messages: [systemPrompt, ...this.history],
                    stream: false,
                    temperature
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 120000
                }
            );
            return response.data.choices[0].message.content as string;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`DeepSeek API error: ${message}`);
            return null;
        }
    }

    private getHtml(webview: vscode.Webview): string {
        const nonce = getNonce();
        const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DeepSeek Chat</title>
<style>
    html, body { height: 100%; margin: 0; padding: 0; }
    body {
        font-family: var(--vscode-font-family);
        color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background);
        display: flex;
        flex-direction: column;
    }
    #toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 10px;
        border-bottom: 1px solid var(--vscode-panel-border);
        font-size: 12px;
    }
    #toolbar button {
        background: transparent;
        color: var(--vscode-foreground);
        border: 1px solid var(--vscode-panel-border);
        padding: 2px 8px;
        font-size: 11px;
        cursor: pointer;
        border-radius: 3px;
    }
    #toolbar button:hover { background: var(--vscode-toolbar-hoverBackground); }
    #messages {
        flex: 1;
        overflow-y: auto;
        padding: 10px;
        font-size: 13px;
        line-height: 1.5;
    }
    .message { margin-bottom: 12px; white-space: pre-wrap; word-wrap: break-word; }
    .role {
        font-size: 11px;
        text-transform: uppercase;
        opacity: 0.7;
        margin-bottom: 3px;
        font-weight: 600;
    }
    .user .role { color: var(--vscode-textLink-foreground); }
    .assistant .role { color: var(--vscode-terminal-ansiGreen); }
    .error .role { color: var(--vscode-errorForeground); }
    .content pre {
        background: var(--vscode-textCodeBlock-background);
        padding: 8px;
        border-radius: 4px;
        overflow-x: auto;
        font-family: var(--vscode-editor-font-family);
        font-size: 12px;
    }
    .content code {
        background: var(--vscode-textCodeBlock-background);
        padding: 1px 4px;
        border-radius: 3px;
        font-family: var(--vscode-editor-font-family);
        font-size: 12px;
    }
    #thinking { font-style: italic; opacity: 0.7; display: none; padding: 0 10px 6px; font-size: 12px; }
    #input-wrap {
        border-top: 1px solid var(--vscode-panel-border);
        padding: 8px;
        display: flex;
        gap: 6px;
    }
    #input {
        flex: 1;
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border);
        padding: 6px 8px;
        font-family: var(--vscode-font-family);
        font-size: 13px;
        resize: vertical;
        min-height: 36px;
        max-height: 160px;
        border-radius: 3px;
    }
    #send {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        padding: 6px 14px;
        cursor: pointer;
        border-radius: 3px;
        font-size: 13px;
    }
    #send:hover { background: var(--vscode-button-hoverBackground); }
    #send:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
</head>
<body>
    <div id="toolbar">
        <span>DeepSeek</span>
        <button id="clear-btn" title="Clear conversation">Clear</button>
    </div>
    <div id="messages"></div>
    <div id="thinking">DeepSeek is thinking…</div>
    <div id="input-wrap">
        <textarea id="input" rows="2" placeholder="Ask DeepSeek anything… (Shift+Enter for newline)"></textarea>
        <button id="send">Send</button>
    </div>
<script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const messagesEl = document.getElementById('messages');
    const input = document.getElementById('input');
    const sendBtn = document.getElementById('send');
    const clearBtn = document.getElementById('clear-btn');
    const thinking = document.getElementById('thinking');

    function escapeHtml(s) {
        return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }
    function renderMarkdown(text) {
        let out = escapeHtml(text);
        out = out.replace(/\`\`\`([\\w-]*)\\n([\\s\\S]*?)\`\`\`/g, (_, lang, code) => '<pre><code>' + code + '</code></pre>');
        out = out.replace(/\`([^\`\\n]+)\`/g, '<code>$1</code>');
        return out;
    }
    function addMessage(role, text) {
        const div = document.createElement('div');
        div.className = 'message ' + role;
        const roleEl = document.createElement('div');
        roleEl.className = 'role';
        roleEl.textContent = role === 'user' ? 'You' : role === 'assistant' ? 'DeepSeek' : 'Error';
        const content = document.createElement('div');
        content.className = 'content';
        content.innerHTML = renderMarkdown(text);
        div.appendChild(roleEl);
        div.appendChild(content);
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    function send() {
        const text = input.value.trim();
        if (!text) return;
        addMessage('user', text);
        vscode.postMessage({ type: 'sendMessage', value: text });
        input.value = '';
        sendBtn.disabled = true;
    }
    sendBtn.addEventListener('click', send);
    clearBtn.addEventListener('click', () => vscode.postMessage({ type: 'clear' }));
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    });
    window.addEventListener('message', e => {
        const msg = e.data;
        if (msg.type === 'response') {
            thinking.style.display = 'none';
            addMessage('assistant', msg.value);
            sendBtn.disabled = false;
            input.focus();
        } else if (msg.type === 'thinking') {
            thinking.style.display = 'block';
        } else if (msg.type === 'error') {
            thinking.style.display = 'none';
            addMessage('error', msg.value);
            sendBtn.disabled = false;
        } else if (msg.type === 'cleared') {
            messagesEl.innerHTML = '';
            thinking.style.display = 'none';
            sendBtn.disabled = false;
        }
    });
</script>
</body>
</html>`;
    }
}

function getNonce(): string {
    let text = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
}
