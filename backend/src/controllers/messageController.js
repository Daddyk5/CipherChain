export function verifyMessageHash(_request, response) {
  response.status(501).json({
    message: 'Message hash verification placeholder. Call the Polygon verifier service here.',
  })
}
