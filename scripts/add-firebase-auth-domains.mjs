/**
 * Adds Capacitor / hosting origins to Firebase Auth authorized domains.
 * Fixes logcat: "The current domain is not authorized for OAuth operations (localhost)".
 *
 * Usage (PowerShell):
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="D:\path\mahalak-0-service-account.json"
 *   npm run add-firebase-auth-domains
 */
import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, '..', 'config', 'firebase.config.json');
const { projectId } = JSON.parse(readFileSync(configPath, 'utf8'));

const REQUIRED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'mahalak-0.web.app',
  'mahalak-0.firebaseapp.com',
  'mahalak-merchant.web.app',
  'mahalak-merchant.firebaseapp.com',
];

async function main() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      'Set GOOGLE_APPLICATION_CREDENTIALS to a mahalak-0 service account JSON file.\n' +
        'Or add these domains manually in Firebase Console → Authentication → Settings → Authorized domains:\n\n' +
        REQUIRED_DOMAINS.join('\n'),
    );
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({ projectId });
  }

  const manager = admin.auth().projectConfigManager();
  const current = await manager.getProjectConfig();
  const merged = new Set([...(current.authorizedDomains || []), ...REQUIRED_DOMAINS]);

  await manager.updateProjectConfig({
    authorizedDomains: [...merged],
  });

  console.log(`Updated authorized domains for ${projectId}:`);
  console.log([...merged].join(', '));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
