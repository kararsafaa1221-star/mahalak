/**
 * Update admin role/permissions in Firestore (project: mahalak-0, database: default).
 *
 * Usage:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="D:\keys\mahalak-0-firebase-adminsdk.json"
 *   npm run set-admin-permissions -- --email admin@example.com --role owner
 *   npm run set-admin-permissions -- <uid> --role supervisor --permissions stores,orders,customers
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
  'overview',
  'stores',
  'customers',
  'orders',
  'products',
  'rechargeCodes',
  'promoCodes',
  'subscriptions',
  'payouts',
  'flashSales',
  'reviews',
  'broadcast',
  'whatsapp',
  'heatmap',
  'database',
  'ads',
  'settings',
  'activityLogs',
];

const VALID_ROLES = ['owner', 'admin', 'supervisor', 'accountant', 'support'];

function parseArgs(argv) {
  let uid = null;
  let email = null;
  let role = 'admin';
  let permissions = null;
  let suspended = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--email') {
      email = argv[++i]?.trim();
    } else if (arg === '--role') {
      role = argv[++i]?.trim();
    } else if (arg === '--permissions') {
      permissions = argv[++i]?.split(',').map((p) => p.trim()).filter(Boolean) ?? [];
    } else if (arg === '--suspend') {
      suspended = true;
    } else if (!arg.startsWith('--') && !uid) {
      uid = arg.trim();
    }
  }

  return { uid, email, role, permissions, suspended };
}

function resolveCredentialsPath() {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!raw) {
    console.error('Missing GOOGLE_APPLICATION_CREDENTIALS.');
    process.exit(1);
  }
  const resolved = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  if (!fs.existsSync(resolved)) {
    console.error(`GOOGLE_APPLICATION_CREDENTIALS file not found: ${resolved}`);
    process.exit(1);
  }
  return resolved;
}

async function resolveUid(auth, uid, email) {
  if (uid) {
    const user = await auth.getUser(uid);
    return { uid: user.uid, email: user.email ?? email ?? '' };
  }
  if (!email) {
    console.error('Provide UID or --email admin@example.com');
    process.exit(1);
  }
  const user = await auth.getUserByEmail(email);
  return { uid: user.uid, email: user.email ?? email };
}

async function main() {
  const { uid: uidArg, email, role, permissions, suspended } = parseArgs(process.argv.slice(2));

  if (!VALID_ROLES.includes(role)) {
    console.error(`Invalid role "${role}". Valid: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }

  const credentialsPath = resolveCredentialsPath();
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(credentialsPath),
      projectId: EXPECTED_PROJECT_ID,
    });
  }

  const auth = admin.auth();
  const firestore = getFirestore(admin.app(), FIRESTORE_DATABASE_ID);
  const { uid, email: resolvedEmail } = await resolveUid(auth, uidArg, email);

  const finalPermissions =
    role === 'owner' || role === 'admin'
      ? ALL_PERMISSIONS
      : (permissions ?? []);

  if (role !== 'owner' && role !== 'admin' && finalPermissions.length === 0) {
    console.error('Provide --permissions for non-admin roles, e.g. --permissions stores,orders');
    process.exit(1);
  }

  const payload = {
    email: resolvedEmail,
    role,
    permissions: finalPermissions,
    status: suspended ? 'suspended' : 'active',
    isSuspended: suspended,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await firestore.doc(`admins/${uid}`).set(payload, { merge: true });

  if (role === 'owner' || role === 'admin') {
    await auth.setCustomUserClaims(uid, { role: 'admin', admin: true });
  } else {
    await auth.setCustomUserClaims(uid, { role, admin: false });
  }

  console.log('Admin permissions updated:');
  console.log(`  UID:         ${uid}`);
  console.log(`  Email:       ${resolvedEmail || '(none)'}`);
  console.log(`  Role:        ${role}`);
  console.log(`  Permissions: ${finalPermissions.join(', ')}`);
  console.log(`  Status:      ${suspended ? 'suspended' : 'active'}`);
}

main().catch((error) => {
  console.error('set-admin-permissions failed:', error.code ?? error.message ?? error);
  process.exit(1);
});
