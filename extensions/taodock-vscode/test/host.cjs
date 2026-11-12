// Runs inside a real VS Code extension host; no network credentials are needed.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vscode = require('vscode');

exports.run = async () => {
  const extension = vscode.extensions.getExtension('taodock.taodock');
  assert.ok(extension, 'Taodock manifest was discovered');
  await extension.activate();
  assert.ok(extension.isActive, 'Taodock activated in the native extension host');
  const commands = await vscode.commands.getCommands(true);
  for (const command of extension.packageJSON.contributes.commands) {
    assert.ok(commands.includes(command.command), `Native command registered: ${command.command}`);
  }
  const implementation = require(path.join(extension.extensionPath, 'dist/extension.js'));
  const messages = implementation.toOpenAIMessages([
    vscode.LanguageModelChatMessage.Assistant([new vscode.LanguageModelToolCallPart('read-one', 'read_file', { path: 'example.txt' })]),
    vscode.LanguageModelChatMessage.User([new vscode.LanguageModelToolResultPart('read-one', [new vscode.LanguageModelTextPart('native tool result')])]),
  ]);
  assert.equal(messages[0].tool_calls[0].id, 'read-one');
  assert.deepEqual(messages[1], { role: 'tool', tool_call_id: 'read-one', content: 'native tool result' });
  const report = { vscode: vscode.version, extension: extension.id, version: extension.packageJSON.version, activation: 'passed', commands: 'passed', nativeToolRoundTrip: 'passed' };
  await fs.writeFile(path.join(extension.extensionPath, 'dist/host-test-result.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('TAODOCK_HOST_TEST_PASSED', JSON.stringify(report));
};
