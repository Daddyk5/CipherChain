import { ethers } from 'hardhat'

async function main() {
  const MessageVerifier = await ethers.getContractFactory('MessageVerifier')
  const verifier = await MessageVerifier.deploy()

  await verifier.waitForDeployment()
  console.log(`MessageVerifier deployed to ${await verifier.getAddress()}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
