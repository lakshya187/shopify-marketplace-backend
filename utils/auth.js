import JWT from "jsonwebtoken";

export function EncryptJWT(payload) {
  return JWT.sign(payload, process.env.JWT_SECRET);
}

export function DecryptJWT(token) {
  return JWT.verify(token, process.env.JWT_SECRET);
}
