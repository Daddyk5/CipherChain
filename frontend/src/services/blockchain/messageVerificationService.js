export async function verifyMessageHash({ contract, messageHash }) {
  if (!contract || !messageHash) {
    return false
  }

  return contract.isMessageVerified(messageHash)
}
