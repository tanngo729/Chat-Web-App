import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN 
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

export const generateTokens = (user) => {
  const payload = { 
    userId: user._id, 
    email: user.email 
  };
  
  const accessToken = generateToken(payload);
  
  return { accessToken };
};