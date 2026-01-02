import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const authMiddleware = (req, res, next) => {
    // Get token from header (support both Authorization and x-auth-token)
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '') || req.header('x-auth-token');

    // Check if no token
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Support both user and admin tokens
        if (decoded.userId) {
            req.user = { id: decoded.userId };
        } else if (decoded.user) {
            req.user = decoded.user;
        } else {
            return res.status(401).json({ message: 'Invalid token format' });
        }
        
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

export default authMiddleware;
