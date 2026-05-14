const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // optionalAuthenticate might have populated req.user if token was provided
    // but if the route requires a role, they MUST be authenticated.
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Insufficient privileges'
      });
    }

    next();
  };
};

module.exports = requireRole;
