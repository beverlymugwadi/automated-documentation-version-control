import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { Documentation } from '../models/Documentation';
import { DocVersion } from '../models/DocVersion';
import { DeveloperNote } from '../models/DeveloperNote';
import { SourceCodeFile } from '../models/SourceCodeFile';

async function seed(): Promise<void> {
  await connectDB();
  console.log('[seed] clearing all collections…');
  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    Documentation.deleteMany({}),
    DocVersion.deleteMany({}),
    DeveloperNote.deleteMany({}),
    SourceCodeFile.deleteMany({}),
  ]);

  console.log('[seed] done ✓  Database is empty. Users and projects are created after login.');
  await disconnectDB();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error('[seed] failed:', err);
  await disconnectDB().catch(() => undefined);
  process.exit(1);
});