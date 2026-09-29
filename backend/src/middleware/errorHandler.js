export function errorHandler(error, _request, response, _next) {
  const statusCode = error.statusCode ?? 500

  if (statusCode >= 500) {
    console.error(error)
    return response.status(statusCode).json({ code: 'INTERNAL', message: 'Unexpected server error' })
  }

  return response.status(statusCode).json({
    code: error.code ?? 'ERROR',
    message: error.message,
  })
}
