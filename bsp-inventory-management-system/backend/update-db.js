const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function updateDb() {
  try {
    await client.connect();
    console.log('Connected to the database.');

    console.log('Dropping existing tables...');
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');

    console.log('Reading database.sql...');
    const sqlPath = path.join(__dirname, 'database.sql');
    const sqlString = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing database.sql...');
    await client.query(sqlString);

    console.log('Database updated successfully!');
  } catch (err) {
    console.error('Error updating database:', err);
  } finally {
    await client.end();
  }
}

updateDb();
