/*
Implements Pure-EdDSA and Hash-EdDSA

The signer has two secret values:

    * k = Secret key
    * r = Per-(message,key) nonce

The signer provides a signature consiting of two values:

    * R = Point, image of `r*B`
    * s = Image of `r + (k*t)`

The signer provides the verifier with their public key:

    * A = k*B

Both the verifier and the signer calculate the common reference string:

    * t = H(R, A, M)

The nonce `r` is secret, and protects the value `s` from revealing the
signers secret key.

For Hash-EdDSA, the message `M` is compressed before H(R,A,M)

For further information see: https://ed2519.cr.yp.to/eddsa-20150704.pdf
*/

import { BigNumber } from "ethers";
import { field, FQ } from "./field";
import { jubjub, Point } from "./jubjub";
import { sha512 } from "js-sha512";
import { permunation, PoseidonParams } from "./permutation";

export class Signature {
  public R: Point;
  public s: FQ;

  constructor(R: Point, s: FQ) {
    this.R = R;
    this.s = s;
  }

  toStr() {
    return `${this.R.x.n} ${this.R.y.n} ${this.s.n}`;
  }
}

export class SignedMessage {
  public A: Point;
  public sig: Signature;
  public msg: BigNumber;

  constructor(A: Point, sig: Signature, msg: BigNumber) {
    this.A = A;
    this.sig = sig;
    this.msg = msg;
  }

  toStr() {
    return `${this.A.x.n} ${
      this.A.y.n
    } ${this.sig.toStr()} ${this.msg.toString()}`;
  }
}

export class SignatureScheme {
  static to_bytes(arg: BigNumber) {
    const outputLength = 32;

    let bitIntDataItems = bnToBuf(arg.toString());

    const more = outputLength - bitIntDataItems.length;
    if (more > 0) {
      for (let i = 0; i < more; i++) {
        bitIntDataItems = [0].concat(bitIntDataItems);
      }
    } else {
      bitIntDataItems = bitIntDataItems.slice(0, outputLength);
    }

    bitIntDataItems = bitIntDataItems.reverse();
    return bitIntDataItems;
  }

  /*
  Identity function for message

  Can be used to truncate the message before hashing it
  as part of the public parameters.
  */
  static prehash_message(M: BigNumber) {
    return M;
  }

  /*
  Hash the key and message to create `r`, the blinding factor for this signature.

  If the same `r` value is used more than once, the key for the signature is revealed.

  From: https://eprint.iacr.org/2015/677.pdf (EdDSA for more curves)

  Page 3:

      (Implementation detail: To save time in the computation of `rB`, the signer
      can replace `r` with `r mod L` before computing `rB`.)
  */
  static hash_secret_python(k: FQ, arg: BigNumber) {
    const byteArray0 = this.to_bytes(k.n);
    const byteArray1 = this.to_bytes(arg);

    const sum = byteArray0.concat(byteArray1);

    const digest1 = sha512.array(new Uint8Array(sum).buffer);

    let sha512StrItems: any;
    for (let i = 0; i < digest1.length; i++) {
      const itemInt = digest1[i];
      let st = itemInt.toString(16);
      if (st.length == 1) {
        st = "0" + st;
      }
      sha512StrItems = [st].concat(sha512StrItems);
    }
    const sha512MessageHexStr = sha512StrItems.join("");
    const sha512MessageHexStrBigInt = BigNumber.from(
      "0x" + sha512MessageHexStr
    );
    const hashed = sha512MessageHexStrBigInt.mod(jubjub.JUBJUB_L);
    return hashed;
  }

  static B() {
    return Point.generate();
  }

  static sign(msg: BigNumber, key: FQ, B: Point) {

    const copyKey = new FQ(key.n, key.m);
    const A = B.mul(copyKey.n);

    const M = this.prehash_message(msg);

    const r = this.hash_secret_python(key, M);

    const copy_r = BigNumber.from(r.toString());

    const R = B.mul(copy_r);

    const t = this.hash_public(R, A, M);

    const t_c = t;
    const key_n_t = key.n.mul(t_c);
    const left = r.add(key_n_t);
    const S = left.mod(jubjub.JUBJUB_E);


    const signatureResult = new Signature(R, new FQ(S));

    const signedMessage = new SignedMessage(A, signatureResult, msg);

    return signedMessage;
  }

  static as_scalar(point: Point) {
    return [point.x.n, point.y.n];
  }

  static hash_public(R: Point, A: Point, M: BigNumber) {
    let inputMsg: any;
    inputMsg = this.as_scalar(R).concat(this.as_scalar(A)).concat([M]);
    const params = new PoseidonParams(
      field.SNARK_SCALAR_FIELD,
      6,
      6,
      52,
      "poseidon",
      BigNumber.from(5),
      null,
      null,
      128
    );
    const result = permunation.poseidon(inputMsg, params);
    return result;
  }
}

export function bnToBuf(bn: string) {
  let hex = BigInt(bn).toString(16);
  if (hex.length % 2) {
    hex = "0" + hex;
  }
  const len = hex.length / 2;

  const u8 = new Uint8Array(len);
  let i = 0;
  let j = 0;
  while (i < len) {
    u8[i] = parseInt(hex.slice(j, j + 2), 16);
    i += 1;
    j += 2;
  }
  return Array.from(u8);
}

export function bnToBufWithFixedLength(bn: string, outputLength: number) {
  let hex = BigInt(bn).toString(16);
  if (hex.length % 2) {
    hex = "0" + hex;
  }
  const len = hex.length / 2;

  const u8 = new Uint8Array(len);
  let i = 0;
  let j = 0;
  while (i < len) {
    u8[i] = parseInt(hex.slice(j, j + 2), 16);
    i += 1;
    j += 2;
  }

  let bitIntDataItems = Array.from(u8);

  const more = outputLength - bitIntDataItems.length;
  if (more > 0) {
    for (let i = 0; i < more; i++) {
      bitIntDataItems = [0].concat(bitIntDataItems);
    }
  } else {
    bitIntDataItems = bitIntDataItems.slice(0, outputLength);
  }

  return bitIntDataItems;
}

export function bufToBn(buf: any) {
  let hex: any;
  hex = [];
  const u8 = Uint8Array.from(buf);

  u8.forEach(function (i) {
    let h = i.toString(16);
    if (h.length % 2) {
      h = "0" + h;
    }
    hex.push(h);
  });

  return BigInt("0x" + hex.join(""));
}

export function bytesToHexString(bytes: any) {
  let strItems: any;
  strItems = [];
  for (let i = 0; i < bytes.length; i++) {
    const item = bytes[i];
    let st = item.toString(16);
    if (st.length == 1) {
      st = "0" + st;
    }
    // st = st.toUpperCase()
    strItems.push(st);
  }
  const strItemsJoined = strItems.join("");
  return strItemsJoined;
}