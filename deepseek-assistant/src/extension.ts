import * as vscode from 'vscode';
import { DeepseekViewProvider } from './deepseekViewProvider';

export function activate(context: vscode.ExtensionContext) {
    const provider = new DeepseekViewProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(DeepseekViewProvider.viewType, provider)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('deepseek-assistant.openChat', () => {
            vscode.commands.executeCommand('workbench.view.extension.deepseek-assistant');
        }),
        vscode.commands.registerCommand('deepseek-assistant.clearChat', () => {
            provider.clearConversation();
        })
    );
}

export function deactivate() {}
