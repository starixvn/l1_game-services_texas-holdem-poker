import crypto from 'crypto';
import configs from '../app-configs';

const algorithm = 'aes-256-cbc';

export const randomString = (length = 22) => {
  return crypto
    .randomBytes(length)
    .toString('hex')
    .slice(0, length - 1);
};

export const createHashMD5 = (value) => {
  return crypto.createHash('md5').update(value).digest('hex');
};

export const encrypt = (plaintext) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, configs.roundResultSecretKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return {
    iv: iv.toString('hex'),
    content: encrypted.toString('hex'),
  };
};

export const decrypt = (data) => {
  const iv = Buffer.from(data.iv, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, configs.roundResultSecretKey, iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(data.content, 'hex')),
    decipher.final(),
  ]);

  return decrypted.toString();
};

export const encryptObject = (object) => encrypt(JSON.stringify(object));

export const decryptObject = (encrypted) => JSON.parse(decrypt(encrypted));
