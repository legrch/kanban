// Node 24 strips TypeScript; resolve the extensionless imports used by the app.
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
registerHooks({resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && context.parentURL) {
    const url = new URL(specifier, context.parentURL);
    if (!existsSync(url) && existsSync(new URL(url.href + '.ts'))) return nextResolve(url.href + '.ts', context);
  }
  return nextResolve(specifier, context);
}});
