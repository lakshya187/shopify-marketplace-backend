/* eslint-disable func-names */
/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
import crypto from "crypto";

// Import crypto module
let ErrorCode; // Define enum for error codes
(function (errorCode) {
  errorCode[(errorCode.success = 0)] = "success";
  errorCode[(errorCode.appIDInvalid = 1)] = "appIDInvalid";
  errorCode[(errorCode.userIDInvalid = 3)] = "userIDInvalid";
  errorCode[(errorCode.secretInvalid = 5)] = "secretInvalid";
  errorCode[(errorCode.effectiveTimeInSecondsInvalid = 6)] =
    "effectiveTimeInSecondsInvalid";
})(ErrorCode || (ErrorCode = {}));

function RndNum(a, b) {
  // Function to return random number within given range
  return Math.ceil((a + (b - a)) * Math.random());
}
// Function to generate random 16 character string
function makeRandomIv() {
  const str = "0123456789abcdefghijklmnopqrstuvwxyz";
  const result = [];
  for (let i = 0; i < 16; i += 1) {
    const r = Math.floor(Math.random() * str.length);
    result.push(str.charAt(r));
  }
  return result.join("");
}
// Function to determine algorithm based on length of secret key (16, 24 or 32 bytes)
function getAlgorithm(keyBase64) {
  const key = Buffer.from(keyBase64);
  switch (key.length) {
    case 16:
      return "aes-128-cbc";
    case 24:
      return "aes-192-cbc";
    case 32:
      return "aes-256-cbc";
    default:
      throw new Error(`Invalid key length: ${key.length}`);
  }
}
// AES encryption function using CBC/PKCS5Padding mode
function aesEncrypt(plainText, key, iv) {
  const cipher = crypto.createCipheriv(getAlgorithm(key), key, iv);
  cipher.setAutoPadding(true);
  const encrypted = cipher.update(plainText);
  const final = cipher.final();
  const out = Buffer.concat([encrypted, final]);
  return Uint8Array.from(out).buffer;
}
// Function to generate token using given parameters
export function generateToken04(userId, effectiveTimeInSeconds, payload) {
  if (!userId || typeof userId !== "string") {
    // Check if userId is valid
    throw new Error({
      errorCode: ErrorCode.userIDInvalid,
      errorMessage: "userId invalid",
    });
  }
  if (!effectiveTimeInSeconds || typeof effectiveTimeInSeconds !== "number") {
    // Check if effectiveTimeInSeconds is valid
    throw new Error({
      errorCode: ErrorCode.effectiveTimeInSecondsInvalid,
      errorMessage: "effectiveTimeInSeconds invalid",
    });
  }
  const createTime = Math.floor(new Date().getTime() / 1000); // Get current time in seconds
  const tokenInfo = {
    // Create object with token information
    app_id: Number(process.env.ZEGO_APP_ID),
    user_id: userId,
    nonce: RndNum(-2147483648, 2147483647),
    ctime: createTime,
    expire: createTime + effectiveTimeInSeconds,
    payload: payload || "",
  };
  const plaintText = JSON.stringify(tokenInfo); // Convert tokenInfo object to JSON string
  const iv = makeRandomIv(); // Generate random 16 character string for iv
  const encryptBuf = aesEncrypt(plaintText, process.env.ZEGO_SERVER_SECRET, iv); // Encrypt JSON string using AES encryption function
  const _a = [new Uint8Array(8), new Uint8Array(2), new Uint8Array(2)];
  const b1 = _a[0];
  const b2 = _a[1];
  const b3 = _a[2];
  new DataView(b1.buffer).setBigInt64(0, BigInt(tokenInfo.expire), false); // Set expire time in binary format
  new DataView(b2.buffer).setUint16(0, iv.length, false); // Set length of iv in binary format
  new DataView(b3.buffer).setUint16(0, encryptBuf.byteLength, false); // Set length of encrypted information in binary format
  const buf = Buffer.concat([
    // Concatenate all binary data
    Buffer.from(b1),
    Buffer.from(b2),
    Buffer.from(iv),
    Buffer.from(b3),
    Buffer.from(encryptBuf),
  ]);
  const dv = new DataView(Uint8Array.from(buf).buffer); // Create DataView object from binary data
  // console.log('-----------------');
  // console.log('-------getBigInt64----------', dv.getBigInt64(0));
  // console.log('-----------------');
  // console.log('-------getUint16----------', dv.getUint16(8));
  // console.log('-----------------');
  return `04${Buffer.from(dv.buffer).toString("base64")}`; // Return final token string in Base64 format
}
