import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db';
import { env } from '../config/env';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { Documentation } from '../models/Documentation';
import { DocVersion } from '../models/DocVersion';
import { compose } from '../services/docComposer';
import { shortHash } from '../lib/crypto';

async function seed(): Promise<void> {
  if (env.mockMode) {
    console.log('[seed] MOCK_MODE is on — the app seeds itself in memory at boot. Nothing to do.');
    return;
  }

  const connected = await connectDB();
  if (!connected) {
    console.error('[seed] No database connection. Set MONGODB_URI and MOCK_MODE=false.');
    process.exit(1);
  }

  console.log('[seed] clearing collections…');
  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    Documentation.deleteMany({}),
    DocVersion.deleteMany({}),
  ]);

  const user = await User.create({
    fullName: 'Ada Lovelace',
    email: 'ada@adgvc.dev',
    passwordHash: await bcrypt.hash('password123', 10),
    githubLogin: 'ada',
  });

  const project = await Project.create({
    userId: user._id,
    projectName: 'Checkout Service',
    description: 'Cart, pricing and currency utilities for the storefront.',
    repoFullName: 'ada/checkout-service',
  });
  await Project.create({ userId: user._id, projectName: 'Auth Gateway', description: 'JWT issuing and session validation.' });

  const { markdown } = compose({
    title: 'Checkout Service API',
    notes: 'Overview: utilities for the checkout cart.\nInstall with npm install @shop/cart.\nGET /api/cart returns the cart.\nTODO: persistence is in-memory only.',
    files: [{ name: 'src/pricing.ts', content: '/** Sum line items. */\nexport function subtotal(items: number[]): number { return items.reduce((a, b) => a + b, 0); }' }],
    sourceRepo: 'ada/checkout-service',
  });

  const doc = await Documentation.create({ projectId: project._id, title: 'Checkout Service API', content: markdown, currentVersion: 3 });

  const variants = [
    { content: markdown, message: 'Initial generation' },
    { content: `${markdown}\n\n_Maintained by the Storefront team._`, message: 'Add ownership note' },
    { content: `${markdown}\n\n_Maintained by the Storefront team._\n\n## Changelog\n- v2 bumped install`, message: 'Add changelog' },
  ];
  let n = 1;
  for (const v of variants) {
    await DocVersion.create({ docId: doc._id, versionNo: n, commitHash: shortHash(`${doc._id}:${n}`), content: v.content, message: v.message });
    n += 1;
  }

  console.log('[seed] done ✓  Login: ada@adgvc.dev / password123');
  await disconnectDB();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error('[seed] failed:', err);
  await disconnectDB().catch(() => undefined);
  process.exit(1);
});