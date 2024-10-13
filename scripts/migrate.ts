import { exec } from 'child_process';

function runMigration() {
  exec('npx prisma migrate dev', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error running migration: ${error.message}`);
      return;
    }

    if (stderr) {
      console.error(`Migration error: ${stderr}`);
      return;
    }

    console.log(`Migration result: ${stdout}`);
  });
}

runMigration();
