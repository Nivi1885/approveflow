const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.replace('Bearer ', '').trim();
  
  if (!token) return res.status(401).json({ message: 'No token, access denied' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Support both id and _id in token
    req.user = {
      id: decoded.id || decoded._id,
      _id: decoded.id || decoded._id,
      role: decoded.role,
      name: decoded.name || 'Unknown'
    };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
