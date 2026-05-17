import { expect } from 'chai'
import { ethers } from 'hardhat'

describe('MessageVerifier', function () {
  it('records a message hash verification once', async function () {
    const MessageVerifier = await ethers.getContractFactory('MessageVerifier')
    const verifier = await MessageVerifier.deploy()
    const hash = ethers.keccak256(ethers.toUtf8Bytes('cipherchain-message'))

    await expect(verifier.verifyMessage(hash)).to.emit(verifier, 'MessageVerified')
    expect(await verifier.isMessageVerified(hash)).to.equal(true)
    await expect(verifier.verifyMessage(hash)).to.be.revertedWith('MessageVerifier: already verified')
  })
})
