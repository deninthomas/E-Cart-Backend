import jwt from 'jsonwebtoken';
import ErrorResponse from '../utils/errorResponse.js';
import User from '../models/User.js';

// Protect routes
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }
  // Set token from cookie
  else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id);
    next();
  } catch (err) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
};

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

// Check if user is the owner of the resource or an admin
export const checkOwnership = (model, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const resource = await model.findById(req.params[paramName]);

      if (!resource) {
        return next(
          new ErrorResponse(
            `Resource not found with id of ${req.params[paramName]}`,
            404
          )
        );
      }

      // Check if user is resource owner or admin
      if (
        resource.user.toString() !== req.user.id &&
        req.user.role !== 'admin'
      ) {
        return next(
          new ErrorResponse(
            `User ${req.user.id} is not authorized to update this resource`,
            401
          )
        );
      }

      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Grant access to specific users
export const authorizeUser = (userId) => {
  return (req, res, next) => {
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};
