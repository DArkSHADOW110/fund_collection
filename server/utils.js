const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');

// Default admin hash for password 'admin123'
const bcrypt = require('bcrypt');

const DEFAULT_USERS = [
  {
    username: "treasurer",
    password: bcrypt.hashSync("admin123", 10),
    role: "admin"
  }
];

const FILE_DEFAULTS = {
  'users.json': DEFAULT_USERS,
  'contributors.json': [],
  'collections.json': [],
  'expenses.json': []
};

async function initStorage() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    for (const [file, defaultData] of Object.entries(FILE_DEFAULTS)) {
      const filePath = path.join(DATA_DIR, file);
      try {
        await fs.access(filePath);
      } catch (e) {
        await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
      }
    }
  } catch (error) {
    console.error("Storage Init Error:", error);
  }
}

async function readData(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  const data = await fs.readFile(filePath, 'utf8');
  return JSON.parse(data);
}

async function writeData(fileName, data) {
  const filePath = path.join(DATA_DIR, fileName);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function generateId(prefix = '') {
  return prefix + crypto.randomUUID().split('-')[0].toUpperCase();
}

module.exports = { initStorage, readData, writeData, generateId };