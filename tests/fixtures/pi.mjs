import { writeFileSync } from 'node:fs';
let input = '';
for await (const chunk of process.stdin) input += chunk;
const task = JSON.parse(input.slice(input.indexOf('\n\n') + 2));
const usage = { input: 10, output: 5, cacheRead: 2, cacheWrite: 0, totalTokens: 17, cost: { input: 0.01, output: 0.02, cacheRead: 0, cacheWrite: 0, total: 0.03 } };
const args = process.argv.slice(2);
const provider = args[args.indexOf('--provider') + 1];
const model = args[args.indexOf('--model') + 1];
const message = (text, stopReason = 'stop') => ({ type: 'message_end', message: { role: 'assistant', provider, model, content: [{ type: 'text', text }], usage, stopReason } });
const emit = event => process.stdout.write(JSON.stringify(event) + '\n');
if (task.pidPath) writeFileSync(task.pidPath, String(process.pid));
switch (task.mode) {
  case 'hang':
    process.on('SIGTERM', () => {});
    setInterval(() => {}, 1000);
    break;
  case 'overflow':
    process.stdout.write('x'.repeat(20000));
    break;
  case 'malformed':
    process.stdout.write('not json\n');
    break;
  case 'empty': break;
  case 'wrong-model': {
    const event = message('wrong model');
    event.message.model = 'silent-substitution';
    emit(event);
    emit({ type: 'agent_settled' });
    break;
  }
  case 'malformed-assistant': {
    emit(message('earlier valid response'));
    const event = message('invalid response');
    delete event.message.usage;
    emit(event);
    emit({ type: 'agent_settled' });
    break;
  }
  case 'retry':
    emit(message('transient failure', 'error'));
    emit(message('recovered'));
    emit({ type: 'agent_settled' });
    break;
  case 'error':
    emit(message('partial', 'error'));
    emit({ type: 'agent_settled' });
    break;
  case 'exit':
    process.stderr.write('provider unavailable');
    process.exitCode = 2;
    break;
  case 'incomplete': emit(message('partial')); break;
  case 'length':
    emit(message('truncated response', 'length'));
    emit({ type: 'agent_settled' });
    break;
  default: {
    emit(message('intermediate', 'toolUse'));
    const bytes = Buffer.from(JSON.stringify(message('Verified 🥔\u2028line\u2029end')) + '\r\n' + JSON.stringify({ type: 'agent_settled' }));
    for (let i = 0; i < bytes.length; i += 3) process.stdout.write(bytes.subarray(i, i + 3));
  }
}
