import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const MessageVerifierModule = buildModule('MessageVerifierModule', (m) => {
  const verifier = m.contract('MessageVerifier')

  return { verifier }
})

export default MessageVerifierModule
