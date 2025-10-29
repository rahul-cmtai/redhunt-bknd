import jwt from 'jsonwebtoken';

export function signJwt(payload, expiresIn = '7d') {
  return jwt.sign(payload, process.env.JWT_SECRET || 'dev_secret', { expiresIn });
}


