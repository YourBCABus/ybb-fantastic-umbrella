import crypto from 'crypto';

let bytes = crypto.randomBytes(32);

let hash = crypto.createHash("sha256")
hash.update(bytes);
console.log(`Hash: ${hash.digest("base64")}`);

console.log(`Token: ${bytes.toString("base64")}`)
