//src/index.ts


import {
    textToUint8Array,
    arrayBufferToBase64Url,
    base64UrlToUint8Array,
    textToBase64Url,
    importKey,
    decodePayload
} from "./utils"

if (typeof crypto === "undefined" || !crypto.subtle)
    throw new Error("SubtleCrypto not supported!")

/**
 * @typedef JwtAlgorithm
 * @type {"none" | "ES256" | "ES384" | "ES512" | "HS256" | "HS384" | "HS512" | "RS256" | "RS384" | "RS512"}
 */
export type JwtAlgorithm = "none" | "ES256" | "ES384" | "ES512" | "HS256" | "HS384" | "HS512" | "RS256" | "RS384" | "RS512"

/**
 * @typedef JwtAlgorithms
 */
export type JwtAlgorithms = {
    [key: string]: SubtleCryptoImportKeyAlgorithm
}

/**
 * @typedef JwtHeader
 * @prop {string} [typ] Type
 */
export type JwtHeader<T = {}> = {
    /**
     * Type (default: `"JWT"`)
     *
     * @default "JWT"
     */
    typ?: string

    /**
     * Algorithm (default: `"HS256"`)
     *
     * @default "HS256"
     */
    alg?: JwtAlgorithm
} & T

/**
 * @typedef JwtPayload
 * @prop {string} [iss] Issuer
 * @prop {string} [sub] Subject
 * @prop {string | string[]} [aud] Audience
 * @prop {string} [exp] Expiration Time
 * @prop {string} [nbf] Not Before
 * @prop {string} [iat] Issued At
 * @prop {string} [jti] JWT ID
 */
export type JwtPayload<T = { [key: string]: any }> = {
    /** Issuer */
    iss?: string

    /** Subject */
    sub?: string

    /** Audience */
    aud?: string | string[]

    /** Expiration Time */
    exp?: number

    /** Not Before */
    nbf?: number

    /** Issued At */
    iat?: number

    /** JWT ID */
    jti?: string
} & T

/**
 * @typedef JwtOptions
 * @prop {JwtAlgorithm | string} algorithm
 */
export type JwtOptions = {
    algorithm?: JwtAlgorithm | string
}

/**
 * @typedef JwtSignOptions
 * @extends JwtOptions
 * @prop {JwtHeader} [header]
 */
export type JwtSignOptions<T> = {
    header?: JwtHeader<T>
} & JwtOptions

/**
 * @typedef JwtVerifyOptions
 * @extends JwtOptions
 * @prop {boolean} [throwError=false] If `true` throw error if checks fail. (default: `false`)
 */
export type JwtVerifyOptions = {
    /**
    * Clock tolerance to help with slightly out of sync systems
    */
    clockTolerance?: number

    /**
     * If `true` throw error if checks fail. (default: `false`)
     *
     * @default false
    */
    throwError?: boolean
} & JwtOptions

/**
 * @typedef JwtData
 * @prop {JwtHeader} header
 * @prop {JwtPayload} payload
 */
export type JwtData<Payload = {}, Header = {}> = {
    header: JwtHeader<Header>
    payload: JwtPayload<Payload>
}

const algorithms: JwtAlgorithms = {
    none:  { name: "none" },
    ES256: { name: "ECDSA", namedCurve: "P-256", hash: { name: "SHA-256" } },
    ES384: { name: "ECDSA", namedCurve: "P-384", hash: { name: "SHA-384" } },
    ES512: { name: "ECDSA", namedCurve: "P-521", hash: { name: "SHA-512" } },
    HS256: { name: "HMAC", hash: { name: "SHA-256" } },
    HS384: { name: "HMAC", hash: { name: "SHA-384" } },
    HS512: { name: "HMAC", hash: { name: "SHA-512" } },
    RS256: { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } },
    RS384: { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-384" } },
    RS512: { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-512" } }
}

/**
 * Signs a payload and returns the token
 *
 * @param payload The payload object. To use `nbf` (Not Before) and/or `exp` (Expiration Time) add `nbf` and/or `exp` to the payload.
 * @param secret A string which is used to sign the payload.
 * @param [options={ algorithm: "HS256", header: { typ: "JWT" } }] The options object or the algorithm.
 * @throws If there"s a validation issue.
 * @returns Returns token as a `string`.
 */
export async function sign<Payload = {}, Header = {}>(payload: JwtPayload<Payload>, secret: string | JsonWebKeyWithKid | CryptoKey | undefined, options: JwtSignOptions<Header> | JwtAlgorithm = "HS256"): Promise<string> {
    if (typeof options === "string")
        options = { algorithm: options }

    options = { algorithm: "HS256", header: { typ: "JWT", ...(options.header ?? {}) } as JwtHeader<Header>, ...options }

    if (!payload || typeof payload !== "object")
        throw new Error("payload must be an object")

    if (options.algorithm !== "none" && (!secret || (typeof secret !== "string" && typeof secret !== "object")))
        throw new Error("secret must be a string, a JWK object or a CryptoKey object")

    if (typeof options.algorithm !== "string")
        throw new Error("options.algorithm must be a string")

    const algorithm: SubtleCryptoImportKeyAlgorithm = algorithms[options.algorithm]

    if (!algorithm)
        throw new Error("algorithm not found")

    if (!payload.iat)
        payload.iat = Math.floor(Date.now() / 1000)

    const partialToken = `${textToBase64Url(JSON.stringify({ ...options.header, alg: options.algorithm }))}.${textToBase64Url(JSON.stringify(payload))}`

    if (options.algorithm === "none")
        return partialToken

    const key = secret instanceof CryptoKey ? secret : await importKey(secret!, algorithm, ["sign"])
    const signature = await crypto.subtle.sign(algorithm, key, textToUint8Array(partialToken))

    return `${partialToken}.${arrayBufferToBase64Url(signature)}`
}

/**
 * Verifies the integrity of the token and returns a boolean value.
 *
 * @param token The token string generated by `sign()`.
 * @param secret The string which was used to sign the payload.
 * @param options The options object or the algorithm.
 * @throws Throws integration errors and if `options.throwError` is set to `true` also throws `NOT_YET_VALID`, `EXPIRED` or `INVALID_SIGNATURE`.
 * @returns Returns the decoded token or `undefined`.
 */
export async function verify<Payload = {}, Header = {}>(token: string, secret: string | JsonWebKeyWithKid | CryptoKey | undefined, options: JwtVerifyOptions | JwtAlgorithm = "HS256"): Promise<JwtData<Payload, Header> | undefined> {
    if (typeof options === "string")
        options = { algorithm: options }
    options = { algorithm: "HS256", clockTolerance: 0, throwError: false, ...options }

    if (typeof token !== "string")
        throw new Error("token must be a string")

    if (options.algorithm !== "none" && typeof secret !== "string" && typeof secret !== "object")
        throw new Error("secret must be a string, a JWK object or a CryptoKey object")

    if (typeof options.algorithm !== "string")
        throw new Error("options.algorithm must be a string")

    const tokenParts = token.split(".", 3)

    if (tokenParts.length < 2)
        throw new Error("token must consist of 2 or more parts")

    const [ tokenHeader, tokenPayload, tokenSignature ] = tokenParts

    const algorithm: SubtleCryptoImportKeyAlgorithm = algorithms[options.algorithm]

    if (!algorithm)
        throw new Error("algorithm not found")

    const decodedToken = decode<Payload, Header>(token)

    try {
        if (decodedToken.header?.alg !== options.algorithm)
            throw new Error("INVALID_SIGNATURE")

        if (decodedToken.payload) {
            const now = Math.floor(Date.now() / 1000)

            if (decodedToken.payload.nbf && decodedToken.payload.nbf > now && (decodedToken.payload.nbf - now) > (options.clockTolerance ?? 0))
                throw new Error("NOT_YET_VALID")

            if (decodedToken.payload.exp && decodedToken.payload.exp <= now && (now - decodedToken.payload.exp) > (options.clockTolerance ?? 0))
                throw new Error("EXPIRED")
        }

        if (algorithm.name === "none")
            return decodedToken

        const key = secret instanceof CryptoKey ? secret : await importKey(secret!, algorithm, ["verify"])

        if (!await crypto.subtle.verify(algorithm, key, base64UrlToUint8Array(tokenSignature), textToUint8Array(`${tokenHeader}.${tokenPayload}`)))
            throw new Error("INVALID_SIGNATURE")

        return decodedToken
    } catch(err) {
        if (options.throwError)
            throw err
        return
    }
}

/**
 * Returns the payload **without** verifying the integrity of the token. Please use `verify()` first to keep your application secure!
 *
 * @param token The token string generated by `sign()`.
 * @returns Returns an `object` containing `header` and `payload`.
 */
export function decode<Payload = {}, Header = {}>(token: string): JwtData<Payload, Header> {
    return {
        header: decodePayload<JwtHeader<Header>>(token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/")),
        payload: decodePayload<JwtPayload<Payload>>(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    }
}

export default {
    sign,
    verify,
    decode
}
//utils

export type KeyUsages = "sign" | "verify"

export function bytesToByteString(bytes: Uint8Array): string {
    let byteStr = ""
    for (let i = 0; i < bytes.byteLength; i++) {
        byteStr += String.fromCharCode(bytes[i])
    }
    return byteStr
}

export function byteStringToBytes(byteStr: string): Uint8Array {
    let bytes = new Uint8Array(byteStr.length)
    for (let i = 0; i < byteStr.length; i++) {
        bytes[i] = byteStr.charCodeAt(i)
    }
    return bytes
}

export function arrayBufferToBase64String(arrayBuffer: ArrayBuffer): string {
    return btoa(bytesToByteString(new Uint8Array(arrayBuffer)))
}

export function base64StringToUint8Array(b64str: string): Uint8Array {
    return byteStringToBytes(atob(b64str))
}

export function textToUint8Array(str: string): Uint8Array {
    return byteStringToBytes(str)
}

export function arrayBufferToText(arrayBuffer: ArrayBuffer): string {
    return bytesToByteString(new Uint8Array(arrayBuffer))
}

export function arrayBufferToBase64Url(arrayBuffer: ArrayBuffer): string {
    return arrayBufferToBase64String(arrayBuffer).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

export function base64UrlToUint8Array(b64url: string): Uint8Array {
    return base64StringToUint8Array(b64url.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, ""))
}

export function textToBase64Url(str: string): string {
    const encoder = new TextEncoder()
    const charCodes = encoder.encode(str)
    const binaryStr = String.fromCharCode(...charCodes)

    return btoa(binaryStr).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

export function pemToBinary(pem: string): Uint8Array {
    return base64StringToUint8Array(pem.replace(/-+(BEGIN|END).*/g, "").replace(/\s/g, ""))
}

export async function importTextSecret(key: string, algorithm: SubtleCryptoImportKeyAlgorithm, keyUsages: KeyUsages[]): Promise<CryptoKey> {
    return await crypto.subtle.importKey("raw", textToUint8Array(key), algorithm, true, keyUsages)
}

export async function importJwk(key: JsonWebKeyWithKid, algorithm: SubtleCryptoImportKeyAlgorithm, keyUsages: KeyUsages[]): Promise<CryptoKey> {
    return await crypto.subtle.importKey("jwk", key, algorithm, true, keyUsages)
}

export async function importPublicKey(key: string, algorithm: SubtleCryptoImportKeyAlgorithm, keyUsages: KeyUsages[]): Promise<CryptoKey> {
    return await crypto.subtle.importKey("spki", pemToBinary(key), algorithm, true, keyUsages)
}

export async function importPrivateKey(key: string, algorithm: SubtleCryptoImportKeyAlgorithm, keyUsages: KeyUsages[]): Promise<CryptoKey> {
    return await crypto.subtle.importKey("pkcs8", pemToBinary(key), algorithm, true, keyUsages)
}

export async function importKey(key: string | JsonWebKeyWithKid, algorithm: SubtleCryptoImportKeyAlgorithm, keyUsages: KeyUsages[]): Promise<CryptoKey> {
    if (typeof key === "object")
        return importJwk(key, algorithm, keyUsages)

    if (typeof key !== "string")
        throw new Error("Unsupported key type!")

    if (key.includes("PUBLIC"))
        return importPublicKey(key, algorithm, keyUsages)

    if (key.includes("PRIVATE"))
        return importPrivateKey(key, algorithm, keyUsages)

    return importTextSecret(key, algorithm, keyUsages)
}

export function decodePayload<T = any>(raw: string): T {
    const bytes = Array.from(atob(raw), char => char.charCodeAt(0));
    const decodedString = new TextDecoder("utf-8").decode(new Uint8Array(bytes));

    return JSON.parse(decodedString);
}