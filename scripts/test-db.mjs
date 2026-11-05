import fs from "fs";
import mysql from "mysql2/promise";

const envFile = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envFile.split("\n")) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
}

async function run() {
  const pool = mysql.createPool({
    host: env.DB_HOST || "mysql-a8ddfe7-sebastianvibr-27cd.f.aivencloud.com",
    port: Number(env.DB_PORT || 11498),
    user: env.DB_USER || "avnadmin",
    password: env.DB_PASSWORD || "AVNS_Uf6WXvDAyoShRFco4GA",
    database: env.DB_NAME || "defaultdb",
    ssl: { rejectUnauthorized: false },
    connectTimeout: 20000,
  });

  const [users] = await pool.query("SELECT * FROM users");
  console.log("Users in DB count:", users.length, users);
  const [households] = await pool.query("SELECT * FROM households");
  console.log("Households in DB:", households);
  const [members] = await pool.query("SELECT * FROM household_members");
  console.log("Members in DB:", members);
  const [accounts] = await pool.query("SELECT * FROM accounts");
  console.log("Accounts in DB count:", accounts.length, accounts);
  const [tasks] = await pool.query("SELECT * FROM tasks");
  console.log("Tasks in DB count:", tasks.length, tasks);
  const [shopping] = await pool.query("SELECT * FROM shopping_lists");
  console.log("Shopping lists count:", shopping.length, shopping);
  const [items] = await pool.query("SELECT * FROM shopping_items");
  console.log("Shopping items count:", items.length, items);
  const [events] = await pool.query("SELECT * FROM events");
  console.log("Events count:", events.length, events);
  const [inventory] = await pool.query("SELECT * FROM inventory");
  console.log("Inventory count:", inventory.length, inventory);

  await pool.end();
}

run().catch(console.error);
