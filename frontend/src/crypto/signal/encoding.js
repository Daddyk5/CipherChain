export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToArrayBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// libsignal ciphertext bodies are "binary strings" (one char per byte).
export const binaryStringToBase64 = (binary) => btoa(binary)
export const base64ToBinaryString = (base64) => atob(base64)

export function equalBuffers(a, b) {
  const x = new Uint8Array(a)
  const y = new Uint8Array(b)
  if (x.length !== y.length) {
    return false
  }
  let diff = 0
  for (let i = 0; i < x.length; i += 1) {
    diff |= x[i] ^ y[i]
  }
  return diff === 0
}
