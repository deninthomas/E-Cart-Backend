// Wrapper function to handle async/await errors in routes
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Export the async handler function
export default asyncHandler;
