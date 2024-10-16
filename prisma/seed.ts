/**
 * Adds seed data to your db
 *
 * @link https://www.prisma.io/docs/guides/database/seed-database
 */
import { PrismaClient } from '@prisma/client';
import process from 'node:process';
import console from 'node:console';
import fsPromises from 'fs/promises';

const prisma = new PrismaClient();

const defaultAdminName = 'chombot';
const adminCredentialsPath = '.admin_credentials.json';

async function main() {
  const displayName = process.env.DEFAULT_ADMIN ?? defaultAdminName;
  console.log(`No admin user found, creating admin user ${displayName}`);
  const fsHandle = await fsPromises.open(adminCredentialsPath, 'w');
  prisma.user.create({
    data: {
      displayName,
      admin: true,
    }
  });

  const adminCredentials = { displayName };
  await fsHandle.writeFile(JSON.stringify(adminCredentials));
  console.log(`Wrote admin credentials to ${adminCredentialsPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
