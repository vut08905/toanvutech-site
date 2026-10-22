const crypto = require('crypto');
const fs = require('fs');

function evpBytesToKey(password, salt, keyLen, ivLen) {
    let d = [];
    let d_i = Buffer.alloc(0);
    while (Buffer.concat(d).length < (keyLen + ivLen)) {
        d_i = crypto.createHash('md5').update(Buffer.concat([d_i, Buffer.from(password, 'utf8'), salt])).digest();
        d.push(d_i);
    }
    const keyIv = Buffer.concat(d);
    return {
        key: keyIv.subarray(0, keyLen),
        iv: keyIv.subarray(keyLen, keyLen + ivLen)
    };
}

function decryptAES(ciphertextBase64, passphrase) {
    const raw = Buffer.from(ciphertextBase64, 'base64');
    const header = raw.subarray(0, 8).toString('utf8');
    if (header !== 'Salted__') {
        throw new Error('Invalid OpenSSL ciphertext header: ' + header);
    }
    const salt = raw.subarray(8, 16);
    const ciphertext = raw.subarray(16);
    
    const { key, iv } = evpBytesToKey(passphrase, salt, 32, 16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(ciphertext, null, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports = { decryptAES };

// Test if run directly
if (require.main === module) {
    const key = "ASgQCLwLHoN/cMzky5XrI5kpQgtNUSrl";
    console.log("Using key:", key);
}
