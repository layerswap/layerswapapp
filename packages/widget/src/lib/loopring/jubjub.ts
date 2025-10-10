/*
This module implements the extended twisted edwards and extended affine coordinates
described in the paper "Twisted Edwards Curves Revisited":

 - https://iacr.org/archive/asiacrypt2008/53500329/53500329.pdf
   Huseyin Hisil, Kenneth Koon-Ho Wong, Gary Carter, and Ed Dawson

        Information Security Institute,
        Queensland University of Technology, QLD, 4000, Australia
        {h.hisil, kk.wong, g.carter, e.dawson}@qut.edu.au

By using the extended coordinate system we can avoid expensive modular exponentiation
calls, for example - a scalar multiplication call (or multiple...) may perform only
one 3d->2d projection at the point where affine coordinates are necessary, and every
intermediate uses a much faster form.

# XXX: none of these functions are constant time, they should not be used interactively!
*/
import { BigNumber } from "ethers";
import { field, FQ } from "./field";
import { SignatureScheme } from "./eddsa";

export class jubjub {
  static JUBJUB_Q = field.SNARK_SCALAR_FIELD
  static JUBJUB_E = BigNumber.from("21888242871839275222246405745257275088614511777268538073601725287587578984328")
  static JUBJUB_C = BigNumber.from("8")  // Cofactor

  static JUBJUB_L = jubjub.JUBJUB_E.div(jubjub.JUBJUB_C)  // L*B = 0, and (2^C)*L == #E
  static JUBJUB_A = BigNumber.from("168700") // Coefficient A
  static JUBJUB_D = BigNumber.from("168696") // Coefficient D
}

export class Point {
  public x: FQ
  public y: FQ

  constructor(x: FQ, y: FQ) {
    this.x = x
    this.y = y
  }

  static generate() {
    const xBigInt = BigNumber.from("16540640123574156134436876038791482806971768689494387082833631921987005038935")
    const yBigInt = BigNumber.from("20819045374670962167435360035096875258406992893633759881276124905556507972311")
    const point = new Point(new FQ(xBigInt), new FQ(yBigInt))
    return point
  }

  mul(scaler: BigNumber) {
    let p = new Point(this.x, this.y)
    let a = Point.infinity()
    let i = 0

    while (!scaler.eq(BigNumber.from("0"))) {
      const bitwiseAnd = scaler.and(BigNumber.from("1"))
      if (!bitwiseAnd.eq(BigNumber.from("0"))) {
        a = a.add(p)
      }
      let copyP1 = new Point(p.x, p.y)
      let copyP2 = new Point(p.x, p.y)
      p = copyP1.add(copyP2)
      scaler = scaler.div(BigNumber.from("2"))
      i = i + 1
    }
    return a
  }

  add(other: Point) {
    if (this.x.n.eq(BigNumber.from("0")) && this.y.n.eq(BigNumber.from("0"))) {
      return other
    }
    const u1 = this.x
    const v1 = this.y
    const u2 = other.x
    const v2 = other.y

    const u3_tmp0 = (u1.mul(v2.n)).add(v1.mul(u2.n).n)
    const u3_tmp1 = u1.mul(u2.n).mul(v1.n).mul(v2.n).mul(jubjub.JUBJUB_D)
    const u3_tmp2 = FQ.one().add(u3_tmp1.n)

    const u3 = u3_tmp0.div(u3_tmp2.n)

    const v3_tmp0 = v1.mul(v2.n)
    const v3_tmp1 = u1.mul(u2.n).mul(jubjub.JUBJUB_A)
    const v3_tmp3 = v3_tmp0.sub(v3_tmp1.n)  
    const v3_tmp5 = FQ.one().sub(u3_tmp1.n)

    const v3 = v3_tmp3.div(v3_tmp5.n)

    return new Point(u3, v3)
  }

  static infinity() {
    return new Point(new FQ(BigNumber.from("0")), new FQ(BigNumber.from("1")))
  }
}

