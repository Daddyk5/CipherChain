export function getProfile(request, response) {
  response.json({
    walletAddress: request.params.walletAddress,
    displayName: null,
    publicKeys: [],
  })
}

export function updateProfile(_request, response) {
  response.status(501).json({
    message: 'Profile update placeholder. Validate schema and write to Firebase Admin here.',
  })
}
