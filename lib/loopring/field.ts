import { BigNumber } from "ethers";
import { BigInteger } from "jsbn";

export class field {
  // Fq is the base field of Jubjub
  static SNARK_SCALAR_FIELD = BigNumber.from("21888242871839275222246405745257275088548364400416034343698204186575808495617")

  // Fr is the scalar field of Jubjub
  static FR_ORDER = BigNumber.from("21888242871839275222246405745257275088614511777268538073601725287587578984328")
}

// A class for field elements in FQ. Wrap a number in this class,
// and it becomes a field element.
export class FQ {
  public m: BigNumber;
  public n: BigNumber;

  constructor(n: BigNumber, field_modulus = field.SNARK_SCALAR_FIELD) {
    this.m = field_modulus;
    this.n = n.mod(this.m);
  }

  //
  // Use this.n as other
  //

  add(other: BigNumber) {
    const on = other
    const n = (this.n.add(on)).mod(this.m)
    return new FQ(n, this.m)
  }

  mul(other: BigNumber) {
    const on = other
    const n = this.n.mul(on).mod(this.m)
    return new FQ(n, this.m)
  }

  sub(other: BigNumber) {
    const on = other
    let new_n: BigNumber;
    if (this.n.gte(on)) {
      new_n = (this.n.sub(on)).mod(this.m)
    } else {
      new_n = (this.n.sub(on).add(this.m)).mod(this.m)
    }
    return new FQ(new_n, this.m)
  }

  div(other: BigNumber) {
    const on_c = other
    const m_c = this.m
    const two_c = BigNumber.from("2")
    const on_power_c = modulo(on_c, m_c.sub(two_c), m_c)
    const n_on_power_remainder = this.n.mul(on_power_c).mod(this.m)

    return new FQ(n_on_power_remainder, this.m)
  }

  static one(modulus: BigNumber = field.SNARK_SCALAR_FIELD) {
    return new FQ(BigNumber.from("1"), modulus)
  }

  static zero(modulus: BigNumber = field.SNARK_SCALAR_FIELD) {
    return new FQ(BigNumber.from("0"), modulus)
  }

}

export function modulo(n: BigNumber, p: BigNumber, m: BigNumber) {
  const n_ = new BigInteger(n.toString())
  const p_ = new BigInteger(p.toString())
  const m_ = new BigInteger(m.toString())

  const result = n_.modPow(p_, m_)
  return BigNumber.from(result.toString())
}