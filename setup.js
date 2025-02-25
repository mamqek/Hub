const { run, writeTextFile } = Deno;

// Install Composer dependencies
console.log("Running composer install...");
await run({
  cmd: ["composer", "install"],
  stdout: "piped",
}).status();

// Install NPM dependencies
console.log("Running npm install...");
await run({
  cmd: ["npm", "install"],
  stdout: "piped",
}).status();

// Initialize .env file
console.log("Initializing .env file...");
await run({
  cmd: ["cp", ".env.example", ".env"], // On Windows, use 'copy' if needed
  stdout: "piped",
}).status();
await run({
  cmd: ["php", "artisan", "key:generate"],
  stdout: "piped",
}).status();

// Initialize database
console.log("Initializing database...");
await writeTextFile("database/database.sqlite", "");

// Populate database
console.log("Populating database...");
await run({
  cmd: ["php", "artisan", "migrate"],
  stdout: "piped",
}).status();
await run({
  cmd: ["php", "artisan", "db:seed"],
  stdout: "piped",
}).status();

console.log("Setup completed successfully!");
