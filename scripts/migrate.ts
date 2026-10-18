import { setupDatabase } from "../src/db/setup";

setupDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
