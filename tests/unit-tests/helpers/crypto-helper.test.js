import crypto from 'crypto';
import { decrypt, encrypt, randomString, createHashMD5 } from '../../../src/helpers/crypto-helper';
import configs from '../../../src/app-configs';

jest.mock('crypto');
jest.mock('../../../src/app-configs', () => ({
  roundResultSecretKey: 'secret',
}));

describe('encrypt', () => {
  const cipher = {
    update: jest.fn().mockReturnValue(Buffer.of(1)),
    final: jest.fn().mockReturnValue(Buffer.of(2)),
  };

  beforeEach(() => {
    crypto.createCipheriv.mockReturnValue(cipher);
    crypto.randomBytes.mockReturnValue(Buffer.of(0));
  });

  describe('when called', () => {
    it('should create a random bytes', () => {
      // Act
      encrypt('');

      // Assert
      expect(crypto.randomBytes).toBeCalledWith(16);
    });

    it('should create a cipheriv', () => {
      // Act
      encrypt('');

      // Assert
      expect(crypto.createCipheriv).toBeCalledWith(
        'aes-256-cbc',
        configs.roundResultSecretKey,
        Buffer.of(0),
      );
    });

    it('should encrypt data', () => {
      // Arrange
      const expected = {
        iv: Buffer.of(0).toString('hex'),
        content: Buffer.concat([Buffer.of(1), Buffer.of(2)]).toString('hex'),
      };
      // Act
      const actual = encrypt('');

      // Assert
      expect(actual).toStrictEqual(expected);
    });
  });
});

describe('decrypt', () => {
  const decipher = {
    update: jest.fn().mockReturnValue(Buffer.of(1)),
    final: jest.fn().mockReturnValue(Buffer.of(2)),
  };

  beforeEach(() => {
    crypto.createDecipheriv.mockReturnValue(decipher);
  });

  describe('when called', () => {
    it('should create a decipheriv', () => {
      // Act
      decrypt({ iv: Buffer.of(1).toString('hex'), content: '' });

      // Assert
      expect(crypto.createDecipheriv).toBeCalledWith(
        'aes-256-cbc',
        configs.roundResultSecretKey,
        Buffer.of(1),
      );
    });

    it('should decrypt data', () => {
      // Arrange
      const expected = Buffer.concat([Buffer.of(1), Buffer.of(2)]).toString();

      // Act
      const actual = decrypt({ iv: Buffer.of(1).toString('hex'), content: '' });

      // Assert
      expect(actual).toBe(expected);
    });
  });
});

describe('randomString', () => {
  describe('when called', () => {
    it('should create a random bytes', () => {
      // Act
      randomString();

      // Assert
      expect(crypto.randomBytes).toBeCalledWith(22);
    });

    it('should return random string', () => {
      // Arrange
      crypto.randomBytes.mockReturnValue(Buffer.of(1));

      // Act
      const actual = randomString();

      // Assert
      expect(actual).toBe('01');
    });
  });
});

describe('createHashMD5', () => {
  const digest = jest.fn().mockReturnValue('hash');
  const update = jest.fn().mockReturnValue({ digest });

  beforeEach(() => {
    crypto.createHash.mockReturnValue({ update });
  });

  describe('when called', () => {
    it('should create a hash', () => {
      // Act
      createHashMD5('');

      // Assert
      expect(crypto.createHash).toBeCalledWith('md5');
    });

    it('should update hash', () => {
      // Act
      createHashMD5('data');

      // Assert
      expect(update).toBeCalledWith('data');
    });

    it('should return random string', () => {
      // Act
      const actual = createHashMD5('data');

      // Assert
      expect(actual).toBe('hash');
    });
  });
});
