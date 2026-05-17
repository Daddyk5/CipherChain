export function requestLogger(request, _response, next) {
  console.info(`${request.method} ${request.originalUrl}`)
  next()
}
