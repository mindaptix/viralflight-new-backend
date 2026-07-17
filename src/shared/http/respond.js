export const sendSuccess = (res, { statusCode = 200, message, ...payload } = {}) => {
  res.status(statusCode).json({
    success: true,
    ...(message ? { message } : {}),
    ...payload,
  });
};

export const sendFailure = (res, { statusCode = 400, message, ...payload } = {}) => {
  res.status(statusCode).json({
    success: false,
    message,
    ...payload,
  });
};
