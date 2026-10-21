import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { userRepository } from '../repositories/userRepository.js';
import { hashPassword } from '../utils/password.js';

export async function bootstrapAdmin(): Promise<void> {
  const adminCount = await userRepository.countAdmins();
  if (adminCount > 0) {
    console.log('[Bootstrap] Administrator account already exists. Skipping auto-provisioning.');
    return;
  }

  const username = env.ADMIN_BOOTSTRAP_USERNAME;
  const password = env.ADMIN_BOOTSTRAP_PASSWORD;
  const email = env.ADMIN_BOOTSTRAP_EMAIL;

  const passwordHash = await hashPassword(password);
  await userRepository.createUser({
    role: 'admin',
    username,
    email,
    displayName: 'System Administrator',
    passwordHash,
    status: 'active'
  });

  console.log(`[Bootstrap] Successfully created initial administrator account:`);
  console.log(`  Username: ${username}`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: (configured in ADMIN_BOOTSTRAP_PASSWORD)`);
}

// If run directly from CLI
if (process.argv[1]?.endsWith('bootstrapAdmin.ts') || process.argv[1]?.endsWith('bootstrapAdmin.js')) {
  (async () => {
    try {
      await connectDB();
      await bootstrapAdmin();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('[Bootstrap] Failed to bootstrap administrator:', err);
      process.exit(1);
    }
  })();
}
