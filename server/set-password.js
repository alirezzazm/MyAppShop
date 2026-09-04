#!/usr/bin/env node
/* Sets or resets the admin password:  node server/set-password.js <password>
   With no argument, generates a strong one and prints it once. */
'use strict';
const crypto = require('crypto');
const auth = require('./auth');

let password = process.argv[2];
let generated = false;
if (!password) {
  password = crypto.randomBytes(12).toString('base64url');
  generated = true;
}

try {
  auth.setPassword(password);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

console.log('Admin password set.');
if (generated) console.log('Password: ' + password + '\n(store it now — it is not shown again)');
console.log('Any existing admin session has been signed out.');
