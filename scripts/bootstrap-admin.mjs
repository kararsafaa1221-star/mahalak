/**
 * Bootstrap a Super Admin for Mahalak (Firebase project: mahalak-0).
 *
 * Usage (PowerShell):
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="D:\path\mahalak-0-service-account.json"
 *   npm run bootstrap-admin -- <firebase-auth-uid> [email@example.com]
 *
 * Or resolve UID by email:
 *   npm run bootstrap-admin -- --email admin@local.com
 *
 * Requires a service account JSON from Firebase Console → Project settings →
 * Service accounts → Generate new private key (project must be mahalak-0).
 */

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPECTED_PROJECT_ID = 'mahalak-0';
const FIRESTORE_DATABASE_ID = 'default';

const ALL_PERMISSIONS = [
  'overview', 'stores', 'customers', 'orders', 'products', 'rechargeCodes', 'promoCodes',
  'subscriptions', 'payouts', 'flashSales', 'reviews', 'broadcast', 'whatsapp', 'heatmap',
  'database', 'ads', 'settings', 'activityLogs',
];
const EXPECTED_SERVICE_ACCOUNT_SUFFIX = `@${EXPECTED_PROJECT_ID}.iam.gserviceaccount.com`;

const args = process.argv.slice(2);
let uidArg = null;
let emailArg = null;

if (args[0] === '--email') {
  emailArg = args[1]?.trim();
  if (!emailArg) {
    console.error('Usage: npm run bootstrap-admin -- --email admin@example.com');
    process.exit(1);
  }
} else {
  uidArg = args[0]?.trim();
  emailArg = args[1]?.trim();
  if (!uidArg) {
    console.error('Usage:');
    console.error('  npm run bootstrap-admin -- <firebase-auth-uid> [email@example.com]');
    console.error('  npm run bootstrap-admin -- --email admin@example.com');
    process.exit(1);
  }
}

function resolveCredentialsPath() {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!raw) {
    console.error('Missing GOOGLE_APPLICATION_CREDENTIALS.');
    console.error('Set it to the absolute path of your mahalak-0 service account JSON, e.g.:');
    console.error('  $env:GOOGLE_APPLICATION_CREDENTIALS="D:\\keys\\mahalak-0-firebase-adminsdk.json"');
    process.exit(1);
  }

  const resolved = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  if (!fs.existsSync(resolved)) {
    console.error(`GOOGLE_APPLICATION_CREDENTIALS file not found: ${resolved}`);
    console.error(`(raw env value: ${raw})`);
    process.exit(1);
  }

  return resolved;
}

function readServiceAccountProjectId(credentialsPath) {
  try {
    const json = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    return {
      projectId: json.project_id ?? json.projectId ?? null,
      clientEmail: json.client_email ?? null,
    };
  } catch (error) {
    console.error(`Failed to parse service account JSON at ${credentialsPath}:`, error.message);
    process.exit(1);
  }
}

function initializeAdminApp(credentialsPath, serviceAccountProjectId) {
  if (admin.apps.length) {
    return admin.app();
  }

  // Force mahalak-0 even if the JSON belongs to another GCP project (will fail fast on API calls).
  const app = admin.initializeApp({
    credential: admin.credential.cert(credentialsPath),
    projectId: EXPECTED_PROJECT_ID,
    databaseURL: 'https://mahalak-0-default-rtdb.europe-west1.firebasedatabase.app',
  });

  if (serviceAccountProjectId && serviceAccountProjectId !== EXPECTED_PROJECT_ID) {
    console.warn('');
    console.warn('⚠️  WARNING: Service account JSON project_id does not match mahalak-0.');
    console.warn(`    JSON project_id: ${serviceAccountProjectId}`);
    console.warn(`    Expected:        ${EXPECTED_PROJECT_ID}`);
    console.warn('    Download a new key from Firebase Console → mahalak-0 → Service accounts.');
    console.warn('');
  }

  return app;
}

async function verifyAuthConnectivity(auth) {
  console.log('[bootstrap] Verifying Auth API connectivity (listUsers max 3)...');
  const list = await auth.listUsers(3);
  console.log(`[bootstrap] Auth reachable. Sample users in this project (${list.users.length} shown):`);
  for (const u of list.users) {
    console.log(`  - uid=${u.uid}  email=${u.email ?? '(none)'}`);
  }
  if (list.users.length === 0) {
    console.warn('[bootstrap] No users returned — project may be empty or credentials lack permission.');
  }
}

async function resolveUid(auth) {
  if (uidArg) {
    console.log(`[bootstrap] Looking up user by UID: ${uidArg}`);
    try {
      const user = await auth.getUser(uidArg);
      console.log(`[bootstrap] Found user: uid=${user.uid} email=${user.email ?? '(none)'}`);
      return { uid: user.uid, email: user.email ?? emailArg ?? '' };
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.error('');
        console.error(`auth/user-not-found for UID "${uidArg}" in project ${EXPECTED_PROJECT_ID}.`);
        console.error('The UID must match Authentication → Users in Firebase Console (mahalak-0).');
        console.error('Try: npm run bootstrap-admin -- --email your@email.com');
        await verifyAuthConnectivity(auth);
      }
      throw error;
    }
  }

  console.log(`[bootstrap] Looking up user by email: ${emailArg}`);
  try {
    const user = await auth.getUserByEmail(emailArg);
    console.log(`[bootstrap] Found user: uid=${user.uid} email=${user.email ?? '(none)'}`);
    return { uid: user.uid, email: user.email ?? emailArg };
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error('');
      console.error(`auth/user-not-found for email "${emailArg}" in project ${EXPECTED_PROJECT_ID}.`);
      console.error('Create the user first: Firebase Console → Authentication → Add user.');
      await verifyAuthConnectivity(auth);
    }
    throw error;
  }
}

async function main() {
  const credentialsPath = resolveCredentialsPath();
  const { projectId: saProjectId, clientEmail } = readServiceAccountProjectId(credentialsPath);

  console.log('=== Mahalak Super Admin Bootstrap ===');
  console.log(`[bootstrap] GOOGLE_APPLICATION_CREDENTIALS: ${credentialsPath}`);
  console.log(`[bootstrap] Service account project_id (from JSON): ${saProjectId ?? '(missing)'}`);
  console.log(`[bootstrap] Service account client_email: ${clientEmail ?? '(missing)'}`);
  if (clientEmail && !clientEmail.endsWith(EXPECTED_SERVICE_ACCOUNT_SUFFIX)) {
    console.warn('');
    console.warn('⚠️  WARNING: Service account email does not look like a mahalak-0 Firebase Admin SDK account.');
    console.warn(`    Expected suffix: ${EXPECTED_SERVICE_ACCOUNT_SUFFIX}`);
    console.warn(`    Got:             ${clientEmail}`);
    console.warn('    Expected example: firebase-adminsdk-fbsvc@mahalak-0.iam.gserviceaccount.com');
    console.warn('');
  }
  console.log(`[bootstrap] Target Firebase project (forced): ${EXPECTED_PROJECT_ID}`);

  const app = initializeAdminApp(credentialsPath, saProjectId);
  console.log(`[bootstrap] admin.app().options.projectId: ${app.options.projectId}`);

  if (app.options.projectId !== EXPECTED_PROJECT_ID) {
    throw new Error(
      `Admin SDK projectId is "${app.options.projectId}" — expected "${EXPECTED_PROJECT_ID}".`,
    );
  }

  const auth = admin.auth();
  const firestore = getFirestore(app, FIRESTORE_DATABASE_ID);

  await verifyAuthConnectivity(auth);

  const { uid, email } = await resolveUid(auth);

  console.log(`[bootstrap] Applying admin claims + Firestore docs for uid=${uid}`);

  await auth.setCustomUserClaims(uid, { role: 'admin', admin: true });

  const userPayload = {
    id: uid,
    role: 'admin',
    ...(email ? { email } : {}),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await firestore.doc(`users/${uid}`).set(userPayload, { merge: true });

  await firestore.doc(`admins/${uid}`).set(
    {
      email,
      role: 'owner',
      permissions: ALL_PERMISSIONS,
      status: 'active',
      bootstrappedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  console.log('');
  console.log('Super Admin (owner) bootstrapped successfully.');
  console.log(`  Project: ${app.options.projectId}`);
  console.log(`  UID:     ${uid}`);
  console.log(`  Email:   ${email || '(not set)'}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Sign out of the Admin Dashboard and sign in again (refresh ID token).');
  console.log('  2. Confirm console shows admins/<uid> exists with role: owner');
}

main().catch((error) => {
  console.error('');
  console.error('Bootstrap failed:', error.code ?? error.message ?? error);
  if (error.code === 'auth/user-not-found') {
    console.error('');
    console.error('Checklist:');
    console.error(`  • Firebase Console project is "${EXPECTED_PROJECT_ID}"`);
    console.error('  • Service account JSON was downloaded from that same project');
    console.error('  • User exists under Authentication → Users');
    console.error('  • UID/email passed to this script matches that user exactly');
  }
  process.exit(1);
});
