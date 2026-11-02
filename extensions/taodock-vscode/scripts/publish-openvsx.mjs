// Publish only after the account holder has completed the Eclipse Publisher Agreement.
import { readFile, stat, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createNamespace, publish } from 'ovsx';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const registryUrl = 'https://open-vsx.org';
let pat = process.env.OVSX_PAT?.trim();

try {
  if (!pat) {
    const tokenFile = process.env.OVSX_PAT_FILE ?? '/private/tmp/taodock-ovsx-token';
    const info = await lstat(tokenFile);
    if (!info.isFile() || (info.mode & 0o077) !== 0) {
      throw new Error('The publishing token must be in a regular file readable only by its owner (chmod 600).');
    }
    pat = (await readFile(tokenFile, 'utf8')).trim();
  }
  if (!pat || /\s/.test(pat)) throw new Error('A valid Open VSX publishing token is required.');
  const extensionFile = fileURLToPath(new URL(`${manifest.name}-${manifest.version}.vsix`, root));
  await stat(extensionFile);
  const namespace = await fetch(`${registryUrl}/api/${encodeURIComponent(manifest.publisher)}`, { redirect: 'error' });
  if (namespace.status === 404) {
    await createNamespace({ name: manifest.publisher, pat, registryUrl });
  } else if (!namespace.ok) {
    throw new Error(`Namespace lookup failed (HTTP ${namespace.status}).`);
  }
  const uploads = await publish({ extensionFile, pat, registryUrl });
  const failure = uploads.find(result => result.status === 'rejected');
  if (failure) throw failure.reason;
  const metadata = await fetch(`${registryUrl}/api/${manifest.publisher}/${manifest.name}/${manifest.version}`, { redirect: 'error' });
  if (!metadata.ok) throw new Error('Upload finished, but registry metadata is not available yet. Check the listing before retrying.');
  const result = await metadata.json();
  if (result.namespace !== manifest.publisher || result.name !== manifest.name || result.version !== manifest.version) {
    throw new Error('Registry metadata does not match the uploaded extension.');
  }
  const checksumUrl = new URL(result.files.sha256);
  if (checksumUrl.origin !== registryUrl) throw new Error('Unexpected registry checksum URL.');
  const checksum = await fetch(checksumUrl, { redirect: 'error' });
  if (!checksum.ok) throw new Error('Unable to verify the published package checksum.');
  const actualHash = (await checksum.text()).trim().split(/\s/)[0];
  const expectedHash = createHash('sha256').update(await readFile(extensionFile)).digest('hex');
  if (actualHash !== expectedHash) throw new Error('The published package checksum does not match the local VSIX.');
  console.log(`Published and verified: ${registryUrl}/extension/${manifest.publisher}/${manifest.name}`);
} catch (error) {
  const message = error instanceof Error ? error.message : 'Open VSX publishing failed.';
  console.error(pat ? message.replaceAll(pat, '[REDACTED]') : message);
  process.exitCode = 1;
} finally {
  pat = undefined;
}
