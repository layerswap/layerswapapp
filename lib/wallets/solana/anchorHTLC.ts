import { Idl } from "@coral-xyz/anchor"

export const AnchorHtlc = (address: string): Idl => ({
  "address": address,
  "metadata": {
    "name": "anchor_htlc",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "add_lock",
      "docs": [
        "@dev Called by the sender to add hashlock to the HTLC",
        "",
        "@param Id of the HTLC.",
        "@param hashlock to be added."
      ],
      "discriminator": [
        242,
        102,
        183,
        107,
        109,
        168,
        82,
        140
      ],
      "accounts": [
        {
          "name": "sender",
          "writable": true,
          "signer": true
        },
        {
          "name": "htlc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "Id"
              }
            ]
          }
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "Id",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "timelock",
          "type": "u64"
        }
      ],
      "returns": {
        "array": [
          "u8",
          32
        ]
      }
    },
    {
      "name": "commit",
      "docs": [
        "@dev Sender / Payer sets up a new pre-hash time lock contract depositing the",
        "funds and providing the reciever/src_receiver and terms.",
        "@param src_receiver reciever of the funds.",
        "@param timelock UNIX epoch seconds time that the lock expires at.",
        "Refunds can be made after this time.",
        "@return Id of the new HTLC. This is needed for subsequent calls."
      ],
      "discriminator": [
        223,
        140,
        142,
        165,
        229,
        208,
        156,
        74
      ],
      "accounts": [
        {
          "name": "sender",
          "writable": true,
          "signer": true
        },
        {
          "name": "htlc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "Id"
              }
            ]
          }
        },
        {
          "name": "htlc_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  116,
                  108,
                  99,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "Id"
              }
            ]
          }
        },
        {
          "name": "token_contract"
        },
        {
          "name": "sender_token_account",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "Id",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "hopChains",
          "type": {
            "vec": "string"
          }
        },
        {
          "name": "hopAssets",
          "type": {
            "vec": "string"
          }
        },
        {
          "name": "hopAddress",
          "type": {
            "vec": "string"
          }
        },
        {
          "name": "dst_chain",
          "type": "string"
        },
        {
          "name": "dst_asset",
          "type": "string"
        },
        {
          "name": "dst_address",
          "type": "string"
        },
        {
          "name": "src_asset",
          "type": "string"
        },
        {
          "name": "src_receiver",
          "type": "pubkey"
        },
        {
          "name": "timelock",
          "type": "u64"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "commit_bump",
          "type": "u8"
        }
      ],
      "returns": {
        "array": [
          "u8",
          32
        ]
      }
    },
    {
      "name": "getDetails",
      "docs": [
        "@dev Get HTLC details.",
        "@param Id of the HTLC."
      ],
      "discriminator": [
        185,
        254,
        236,
        165,
        213,
        30,
        224,
        250
      ],
      "accounts": [
        {
          "name": "htlc",
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "Id"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "Id",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ],
      "returns": {
        "defined": {
          "name": "HTLC"
        }
      }
    },
    {
      "name": "get_commit_id",
      "docs": [
        "@dev Called by the Sender to get the commitId from the given parameters."
      ],
      "discriminator": [
        9,
        198,
        196,
        84,
        37,
        226,
        163,
        166
      ],
      "accounts": [
        {
          "name": "sender"
        },
        {
          "name": "receiver"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "timelock",
          "type": "u64"
        }
      ],
      "returns": {
        "array": [
          "u8",
          32
        ]
      }
    },
    {
      "name": "lock",
      "docs": [
        "@dev Sender / Payer sets up a new hash time lock contract depositing the",
        "funds and providing the reciever and terms.",
        "@param src_receiver receiver of the funds.",
        "@param hashlock A sha-256 hash hashlock.",
        "@param timelock UNIX epoch seconds time that the lock expires at.",
        "Refunds can be made after this time.",
        "@return Id of the new HTLC. This is needed for subsequent calls."
      ],
      "discriminator": [
        21,
        19,
        208,
        43,
        237,
        62,
        255,
        87
      ],
      "accounts": [
        {
          "name": "sender",
          "writable": true,
          "signer": true
        },
        {
          "name": "htlc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "Id"
              }
            ]
          }
        },
        {
          "name": "htlc_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  116,
                  108,
                  99,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "Id"
              }
            ]
          }
        },
        {
          "name": "token_contract"
        },
        {
          "name": "sender_token_account",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "Id",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "timelock",
          "type": "u64"
        },
        {
          "name": "dst_chain",
          "type": "string"
        },
        {
          "name": "dst_address",
          "type": "string"
        },
        {
          "name": "dst_asset",
          "type": "string"
        },
        {
          "name": "src_asset",
          "type": "string"
        },
        {
          "name": "src_receiver",
          "type": "pubkey"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "lock_bump",
          "type": "u8"
        }
      ],
      "returns": {
        "array": [
          "u8",
          32
        ]
      }
    },
    {
      "name": "redeem",
      "docs": [
        "@dev Called by the src_receiver once they know the secret of the hashlock.",
        "This will transfer the locked funds to the HTLC's src_receiver's address.",
        "",
        "@param Id of the HTLC.",
        "@param secret sha256(secret) should equal the contract hashlock."
      ],
      "discriminator": [
        184,
        12,
        86,
        149,
        70,
        196,
        97,
        225
      ],
      "accounts": [
        {
          "name": "user_signing",
          "writable": true,
          "signer": true
        },
        {
          "name": "htlc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "Id"
              }
            ]
          }
        },
        {
          "name": "htlc_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  116,
                  108,
                  99,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "Id"
              }
            ]
          }
        },
        {
          "name": "src_receiver_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "src_receiver"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "token_contract"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "sender",
          "writable": true,
          "relations": [
            "htlc"
          ]
        },
        {
          "name": "src_receiver",
          "relations": [
            "htlc"
          ]
        },
        {
          "name": "token_contract",
          "relations": [
            "htlc"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associated_token_program",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "Id",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "secret",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "htlc_bump",
          "type": "u8"
        }
      ],
      "returns": "bool"
    },
    {
      "name": "refund",
      "docs": [
        "@dev Called by the sender if there was no redeem AND the time lock has",
        "expired. This will refund the contract amount.",
        "",
        "@param Id of the HTLC to refund from."
      ],
      "discriminator": [
        2,
        96,
        183,
        251,
        63,
        208,
        46,
        46
      ],
      "accounts": [
        {
          "name": "user_signing",
          "writable": true,
          "signer": true
        },
        {
          "name": "htlc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "Id"
              }
            ]
          }
        },
        {
          "name": "htlc_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  116,
                  108,
                  99,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "Id"
              }
            ]
          }
        },
        {
          "name": "sender",
          "writable": true,
          "relations": [
            "htlc"
          ]
        },
        {
          "name": "token_contract",
          "relations": [
            "htlc"
          ]
        },
        {
          "name": "sender_token_account",
          "writable": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "Id",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "htlc_bump",
          "type": "u8"
        }
      ],
      "returns": "bool"
    }
  ],
  "accounts": [
    {
      "name": "HTLC",
      "discriminator": [
        172,
        245,
        108,
        24,
        224,
        199,
        55,
        177
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "NotFutureTimeLock",
      "msg": "Not Future TimeLock."
    },
    {
      "code": 6001,
      "name": "NotPastTimeLock",
      "msg": "Not Past TimeLock."
    },
    {
      "code": 6002,
      "name": "HashlockNotSet",
      "msg": "Hashlock Is Not Set."
    },
    {
      "code": 6003,
      "name": "HashlockNoMatch",
      "msg": "Does Not Match the Hashlock."
    },
    {
      "code": 6004,
      "name": "HashlockAlreadySet",
      "msg": "Hashlock Already Set."
    },
    {
      "code": 6005,
      "name": "AlreadyRedeemed",
      "msg": "Funds Are Alredy Redeemed."
    },
    {
      "code": 6006,
      "name": "AlreadyRefunded",
      "msg": "Funds Are Alredy Refunded."
    },
    {
      "code": 6007,
      "name": "FundsNotSent",
      "msg": "Funds Can Not Be Zero."
    },
    {
      "code": 6008,
      "name": "UnauthorizedAccess",
      "msg": "Unauthorized Access."
    },
    {
      "code": 6009,
      "name": "NotOwner",
      "msg": "Not The Owner."
    },
    {
      "code": 6010,
      "name": "NotSender",
      "msg": "Not The Sender."
    },
    {
      "code": 6011,
      "name": "NotReciever",
      "msg": "Not The Reciever."
    },
    {
      "code": 6012,
      "name": "NoToken",
      "msg": "Wrong Token."
    }
  ],
  "types": [
    {
      "name": "HTLC",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "dst_address",
            "type": "string"
          },
          {
            "name": "dst_chain",
            "type": "string"
          },
          {
            "name": "dst_asset",
            "type": "string"
          },
          {
            "name": "src_asset",
            "type": "string"
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "src_receiver",
            "type": "pubkey"
          },
          {
            "name": "hashlock",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "secret",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timelock",
            "type": "u64"
          },
          {
            "name": "token_contract",
            "type": "pubkey"
          },
          {
            "name": "token_wallet",
            "type": "pubkey"
          },
          {
            "name": "redeemed",
            "type": "bool"
          },
          {
            "name": "refunded",
            "type": "bool"
          }
        ]
      }
    }
  ]
})