export const AnchorHtlc: AnchorHtlcType = {
  "address": "Q8FQN3wo6oVXXS8ZbbJgmWKYmmrEGC29ALQL2zFwQxD",
  "metadata": {
    "name": "anchorHtlc",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "commit",
      "docs": [
        "@dev Sender / Payer sets up a new pre-hash time lock contract depositing the",
        "funds and providing the reciever/srcReceiver and terms.",
        "@param srcReceiver reciever of the funds.",
        "@param timelock UNIX epoch seconds time that the lock expires at.",
        "Refunds can be made after this time.",
        "@return Id of the new PHTLC. This is needed for subsequent calls."
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
          "name": "phtlc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "commitId"
              }
            ]
          }
        },
        {
          "name": "phtlcTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
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
                "path": "commitId"
              }
            ]
          }
        },
        {
          "name": "commitCounter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  67,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "tokenContract"
        },
        {
          "name": "senderTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "commitId",
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
          "name": "dstChain",
          "type": "string"
        },
        {
          "name": "dstAsset",
          "type": "string"
        },
        {
          "name": "dstAddress",
          "type": "string"
        },
        {
          "name": "srcAsset",
          "type": "string"
        },
        {
          "name": "srcReceiver",
          "type": "pubkey"
        },
        {
          "name": "timelock",
          "type": "u64"
        },
        {
          "name": "messenger",
          "type": "pubkey"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "phtlcBump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "getCommitDetails",
      "docs": [
        "@dev Get PHTLC details.",
        "@param lockId of the PHTLC."
      ],
      "discriminator": [
        234,
        217,
        223,
        134,
        74,
        122,
        105,
        206
      ],
      "accounts": [
        {
          "name": "phtlc",
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "commitId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "commitId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "phtlcBump",
          "type": "u8"
        }
      ],
      "returns": {
        "defined": {
          "name": "phtlc"
        }
      }
    },
    {
      "name": "getLockDetails",
      "docs": [
        "@dev Get HTLC details.",
        "@param lockId of the HTLC."
      ],
      "discriminator": [
        7,
        77,
        156,
        156,
        110,
        235,
        80,
        251
      ],
      "accounts": [
        {
          "name": "htlc",
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "lockId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "lockId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "htlcBump",
          "type": "u8"
        }
      ],
      "returns": {
        "defined": {
          "name": "htlc"
        }
      }
    },
    {
      "name": "getLockIdByCommitId",
      "discriminator": [
        94,
        198,
        7,
        168,
        151,
        95,
        85,
        15
      ],
      "accounts": [
        {
          "name": "lockIdStruct",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  95,
                  116,
                  111,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "commitId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "commitId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
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
      "name": "getCommitId",
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
          "name": "commitCounter",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  67,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              }
            ]
          }
        }
      ],
      "args": [],
      "returns": "u64"
    },
    {
      "name": "initLockIdByCommitId",
      "discriminator": [
        131,
        125,
        163,
        39,
        191,
        150,
        63,
        79
      ],
      "accounts": [
        {
          "name": "sender",
          "writable": true,
          "signer": true
        },
        {
          "name": "lockIdStruct",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  95,
                  116,
                  111,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "commitId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "commitId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "initialize",
      "docs": [
        "@dev Called by the owner(only once) to initialize the commit Counter."
      ],
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "commitCounter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  67,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "lock",
      "docs": [
        "@dev Sender / Payer sets up a new hash time lock contract depositing the",
        "funds and providing the reciever and terms.",
        "@param srcReceiver receiver of the funds.",
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
                "path": "lockId"
              }
            ]
          }
        },
        {
          "name": "htlcTokenAccount",
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
                "path": "lockId"
              }
            ]
          }
        },
        {
          "name": "lockIdStruct",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  95,
                  116,
                  111,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "commitId"
              }
            ]
          }
        },
        {
          "name": "tokenContract"
        },
        {
          "name": "senderTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "lockId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "commitId",
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
          "name": "dstChain",
          "type": "string"
        },
        {
          "name": "dstAddress",
          "type": "string"
        },
        {
          "name": "dstAsset",
          "type": "string"
        },
        {
          "name": "srcAsset",
          "type": "string"
        },
        {
          "name": "srcReceiver",
          "type": "pubkey"
        },
        {
          "name": "messenger",
          "type": "pubkey"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "htlcBump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "lockCommit",
      "docs": [
        "@dev Called by the messenger to convert the PHTLC to HTLC",
        "",
        "@param commitId of the PHTLC to lockCommit.",
        "@param hashlock of the HTLC to be created."
      ],
      "discriminator": [
        165,
        2,
        57,
        117,
        110,
        94,
        153,
        251
      ],
      "accounts": [
        {
          "name": "messenger",
          "writable": true,
          "signer": true
        },
        {
          "name": "phtlc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "commitId"
              }
            ]
          }
        },
        {
          "name": "htlc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "lockId"
              }
            ]
          }
        },
        {
          "name": "phtlcTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
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
                "path": "commitId"
              }
            ]
          }
        },
        {
          "name": "htlcTokenAccount",
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
                "path": "lockId"
              }
            ]
          }
        },
        {
          "name": "tokenContract",
          "relations": [
            "phtlc"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "commitId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "lockId",
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
          "name": "phtlcBump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "redeem",
      "docs": [
        "@dev Called by the srcReceiver once they know the secret of the hashlock.",
        "This will transfer the locked funds to the HTLC's srcReceiver's address.",
        "",
        "@param lockId of the HTLC.",
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
          "name": "userSigning",
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
                "path": "lockId"
              }
            ]
          }
        },
        {
          "name": "htlcTokenAccount",
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
                "path": "lockId"
              }
            ]
          }
        },
        {
          "name": "srcReceiverTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "srcReceiver"
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
                "path": "tokenContract"
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
          "name": "srcReceiver",
          "relations": [
            "htlc"
          ]
        },
        {
          "name": "tokenContract",
          "relations": [
            "htlc"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "lockId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "secret",
          "type": "bytes"
        },
        {
          "name": "htlcBump",
          "type": "u8"
        }
      ],
      "returns": "bool"
    },
    {
      "name": "uncommit",
      "docs": [
        "@dev Called by the sender if there was no redeem OR lockCommit AND the time lock has",
        "expired. This will unlock the contract amount.",
        "",
        "@param commitId of the PHTLC to unlock from.",
        "@return bool true on success"
      ],
      "discriminator": [
        87,
        248,
        220,
        24,
        213,
        171,
        93,
        83
      ],
      "accounts": [
        {
          "name": "userSigning",
          "writable": true,
          "signer": true
        },
        {
          "name": "phtlc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "commitId"
              }
            ]
          }
        },
        {
          "name": "phtlcTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
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
                "path": "commitId"
              }
            ]
          }
        },
        {
          "name": "sender",
          "writable": true,
          "relations": [
            "phtlc"
          ]
        },
        {
          "name": "tokenContract",
          "relations": [
            "phtlc"
          ]
        },
        {
          "name": "senderTokenAccount",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "commitId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "phtlcBump",
          "type": "u8"
        }
      ],
      "returns": "bool"
    },
    {
      "name": "unlock",
      "docs": [
        "@dev Called by the sender if there was no redeem AND the time lock has",
        "expired. This will unlock the contract amount.",
        "",
        "@param commitId of the HTLC to unlock from."
      ],
      "discriminator": [
        101,
        155,
        40,
        21,
        158,
        189,
        56,
        203
      ],
      "accounts": [
        {
          "name": "userSigning",
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
                "path": "lockId"
              }
            ]
          }
        },
        {
          "name": "htlcTokenAccount",
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
                "path": "lockId"
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
          "name": "tokenContract",
          "relations": [
            "htlc"
          ]
        },
        {
          "name": "senderTokenAccount",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "lockId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "htlcBump",
          "type": "u8"
        }
      ],
      "returns": "bool"
    }
  ],
  "accounts": [
    {
      "name": "commitCounter",
      "discriminator": [
        212,
        48,
        98,
        236,
        88,
        247,
        14,
        230
      ]
    },
    {
      "name": "htlc",
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
    },
    {
      "name": "lockIdStruct",
      "discriminator": [
        97,
        193,
        114,
        198,
        198,
        10,
        156,
        66
      ]
    },
    {
      "name": "phtlc",
      "discriminator": [
        252,
        8,
        240,
        212,
        38,
        61,
        30,
        242
      ]
    }
  ],
  "events": [
    {
      "name": "tokenCommitted",
      "discriminator": [
        198,
        227,
        27,
        10,
        43,
        217,
        121,
        127
      ]
    },
    {
      "name": "tokenLocked",
      "discriminator": [
        18,
        238,
        170,
        48,
        2,
        120,
        199,
        224
      ]
    },
    {
      "name": "tokenRedeemed",
      "discriminator": [
        75,
        7,
        43,
        228,
        204,
        167,
        97,
        76
      ]
    },
    {
      "name": "tokenUncommited",
      "discriminator": [
        198,
        49,
        47,
        30,
        198,
        28,
        79,
        14
      ]
    },
    {
      "name": "tokenUnlocked",
      "discriminator": [
        86,
        204,
        216,
        175,
        122,
        181,
        8,
        237
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "notFutureTimeLock",
      "msg": "Not Future TimeLock."
    },
    {
      "code": 6001,
      "name": "notPastTimeLock",
      "msg": "Not Past TimeLock."
    },
    {
      "code": 6002,
      "name": "hashlockNoMatch",
      "msg": "Does Not Match the Hashlock."
    },
    {
      "code": 6003,
      "name": "alreadyRedeemed",
      "msg": "Funds Are Alredy Redeemed."
    },
    {
      "code": 6004,
      "name": "alreadyUnlocked",
      "msg": "Funds Are Alredy Unlocked."
    },
    {
      "code": 6005,
      "name": "alreadyUncommitted",
      "msg": "Funds Are Alredy Uncommitted."
    },
    {
      "code": 6006,
      "name": "alreadyLocked",
      "msg": "Already Locked."
    },
    {
      "code": 6007,
      "name": "fundsNotSent",
      "msg": "Funds Can Not Be Zero."
    },
    {
      "code": 6008,
      "name": "unauthorizedAccess",
      "msg": "Unauthorized Access."
    },
    {
      "code": 6009,
      "name": "notOwner",
      "msg": "Not The Owner."
    },
    {
      "code": 6010,
      "name": "notSender",
      "msg": "Not The Sender."
    },
    {
      "code": 6011,
      "name": "notReciever",
      "msg": "Not The Reciever."
    },
    {
      "code": 6012,
      "name": "noToken",
      "msg": "Wrong Token."
    }
  ],
  "types": [
    {
      "name": "commitCounter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "count",
            "type": "u64"
          },
          {
            "name": "time",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "htlc",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "dstAddress",
            "type": "string"
          },
          {
            "name": "dstChain",
            "type": "string"
          },
          {
            "name": "dstAsset",
            "type": "string"
          },
          {
            "name": "srcAsset",
            "type": "string"
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "srcReceiver",
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
            "type": "bytes"
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
            "name": "tokenContract",
            "type": "pubkey"
          },
          {
            "name": "tokenWallet",
            "type": "pubkey"
          },
          {
            "name": "redeemed",
            "type": "bool"
          },
          {
            "name": "unlocked",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "lockIdStruct",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lockId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "phtlc",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "dstAddress",
            "type": "string"
          },
          {
            "name": "dstChain",
            "type": "string"
          },
          {
            "name": "dstAsset",
            "type": "string"
          },
          {
            "name": "srcAsset",
            "type": "string"
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "srcReceiver",
            "type": "pubkey"
          },
          {
            "name": "lockId",
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
            "name": "messenger",
            "type": "pubkey"
          },
          {
            "name": "tokenContract",
            "type": "pubkey"
          },
          {
            "name": "tokenWallet",
            "type": "pubkey"
          },
          {
            "name": "locked",
            "type": "bool"
          },
          {
            "name": "uncommitted",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "tokenCommitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commitId",
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
            "name": "dstChain",
            "type": "string"
          },
          {
            "name": "dstAddress",
            "type": "string"
          },
          {
            "name": "dstAsset",
            "type": "string"
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "srcReceiver",
            "type": "pubkey"
          },
          {
            "name": "srcAsset",
            "type": "string"
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
            "name": "messenger",
            "type": "pubkey"
          },
          {
            "name": "tokenContract",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "tokenLocked",
      "type": {
        "kind": "struct",
        "fields": [
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
            "name": "dstChain",
            "type": "string"
          },
          {
            "name": "dstAddress",
            "type": "string"
          },
          {
            "name": "dstAsset",
            "type": "string"
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "srcReceiver",
            "type": "pubkey"
          },
          {
            "name": "srcAsset",
            "type": "string"
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
            "name": "messenger",
            "type": "pubkey"
          },
          {
            "name": "commitId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "tokenContract",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "tokenRedeemed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lockId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "redeemAddress",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "tokenUncommited",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commitId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "tokenUnlocked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lockId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    }
  ]
};

export type AnchorHtlcType = {
  "address": "Q8FQN3wo6oVXXS8ZbbJgmWKYmmrEGC29ALQL2zFwQxD",
  "metadata": {
    "name": "anchorHtlc",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "commit",
      "docs": [
        "@dev Sender / Payer sets up a new pre-hash time lock contract depositing the",
        "funds and providing the reciever/srcReceiver and terms.",
        "@param srcReceiver reciever of the funds.",
        "@param timelock UNIX epoch seconds time that the lock expires at.",
        "Refunds can be made after this time.",
        "@return Id of the new PHTLC. This is needed for subsequent calls."
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
          "name": "phtlc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "commitId"
              }
            ]
          }
        },
        {
          "name": "phtlcTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
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
                "path": "commitId"
              }
            ]
          }
        },
        {
          "name": "commitCounter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  67,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "tokenContract"
        },
        {
          "name": "senderTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "commitId",
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
          "name": "dstChain",
          "type": "string"
        },
        {
          "name": "dstAsset",
          "type": "string"
        },
        {
          "name": "dstAddress",
          "type": "string"
        },
        {
          "name": "srcAsset",
          "type": "string"
        },
        {
          "name": "srcReceiver",
          "type": "pubkey"
        },
        {
          "name": "timelock",
          "type": "u64"
        },
        {
          "name": "messenger",
          "type": "pubkey"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "phtlcBump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "getCommitDetails",
      "docs": [
        "@dev Get PHTLC details.",
        "@param lockId of the PHTLC."
      ],
      "discriminator": [
        234,
        217,
        223,
        134,
        74,
        122,
        105,
        206
      ],
      "accounts": [
        {
          "name": "phtlc",
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "commitId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "commitId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "phtlcBump",
          "type": "u8"
        }
      ],
      "returns": {
        "defined": {
          "name": "phtlc"
        }
      }
    },
    {
      "name": "getLockDetails",
      "docs": [
        "@dev Get HTLC details.",
        "@param lockId of the HTLC."
      ],
      "discriminator": [
        7,
        77,
        156,
        156,
        110,
        235,
        80,
        251
      ],
      "accounts": [
        {
          "name": "htlc",
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "lockId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "lockId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "htlcBump",
          "type": "u8"
        }
      ],
      "returns": {
        "defined": {
          "name": "htlc"
        }
      }
    },
    {
      "name": "getLockIdByCommitId",
      "discriminator": [
        94,
        198,
        7,
        168,
        151,
        95,
        85,
        15
      ],
      "accounts": [
        {
          "name": "lockIdStruct",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  95,
                  116,
                  111,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "commitId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "commitId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
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
      "name": "getCommitId",
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
          "name": "commitCounter",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  67,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              }
            ]
          }
        }
      ],
      "args": [],
      "returns": "u64"
    },
    {
      "name": "initLockIdByCommitId",
      "discriminator": [
        131,
        125,
        163,
        39,
        191,
        150,
        63,
        79
      ],
      "accounts": [
        {
          "name": "sender",
          "writable": true,
          "signer": true
        },
        {
          "name": "lockIdStruct",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  95,
                  116,
                  111,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "commitId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "commitId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "initialize",
      "docs": [
        "@dev Called by the owner(only once) to initialize the commit Counter."
      ],
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "commitCounter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  67,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "lock",
      "docs": [
        "@dev Sender / Payer sets up a new hash time lock contract depositing the",
        "funds and providing the reciever and terms.",
        "@param srcReceiver receiver of the funds.",
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
                "path": "lockId"
              }
            ]
          }
        },
        {
          "name": "htlcTokenAccount",
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
                "path": "lockId"
              }
            ]
          }
        },
        {
          "name": "lockIdStruct",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  95,
                  116,
                  111,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "commitId"
              }
            ]
          }
        },
        {
          "name": "tokenContract"
        },
        {
          "name": "senderTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "lockId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "commitId",
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
          "name": "dstChain",
          "type": "string"
        },
        {
          "name": "dstAddress",
          "type": "string"
        },
        {
          "name": "dstAsset",
          "type": "string"
        },
        {
          "name": "srcAsset",
          "type": "string"
        },
        {
          "name": "srcReceiver",
          "type": "pubkey"
        },
        {
          "name": "messenger",
          "type": "pubkey"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "htlcBump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "lockCommit",
      "docs": [
        "@dev Called by the messenger to convert the PHTLC to HTLC",
        "",
        "@param commitId of the PHTLC to lockCommit.",
        "@param hashlock of the HTLC to be created."
      ],
      "discriminator": [
        165,
        2,
        57,
        117,
        110,
        94,
        153,
        251
      ],
      "accounts": [
        {
          "name": "messenger",
          "writable": true,
          "signer": true
        },
        {
          "name": "phtlc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "commitId"
              }
            ]
          }
        },
        {
          "name": "htlc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "lockId"
              }
            ]
          }
        },
        {
          "name": "phtlcTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
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
                "path": "commitId"
              }
            ]
          }
        },
        {
          "name": "htlcTokenAccount",
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
                "path": "lockId"
              }
            ]
          }
        },
        {
          "name": "tokenContract",
          "relations": [
            "phtlc"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "commitId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "lockId",
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
          "name": "phtlcBump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "redeem",
      "docs": [
        "@dev Called by the srcReceiver once they know the secret of the hashlock.",
        "This will transfer the locked funds to the HTLC's srcReceiver's address.",
        "",
        "@param lockId of the HTLC.",
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
          "name": "userSigning",
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
                "path": "lockId"
              }
            ]
          }
        },
        {
          "name": "htlcTokenAccount",
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
                "path": "lockId"
              }
            ]
          }
        },
        {
          "name": "srcReceiverTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "srcReceiver"
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
                "path": "tokenContract"
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
          "name": "srcReceiver",
          "relations": [
            "htlc"
          ]
        },
        {
          "name": "tokenContract",
          "relations": [
            "htlc"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "lockId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "secret",
          "type": "bytes"
        },
        {
          "name": "htlcBump",
          "type": "u8"
        }
      ],
      "returns": "bool"
    },
    {
      "name": "uncommit",
      "docs": [
        "@dev Called by the sender if there was no redeem OR lockCommit AND the time lock has",
        "expired. This will unlock the contract amount.",
        "",
        "@param commitId of the PHTLC to unlock from.",
        "@return bool true on success"
      ],
      "discriminator": [
        87,
        248,
        220,
        24,
        213,
        171,
        93,
        83
      ],
      "accounts": [
        {
          "name": "userSigning",
          "writable": true,
          "signer": true
        },
        {
          "name": "phtlc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "commitId"
              }
            ]
          }
        },
        {
          "name": "phtlcTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
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
                "path": "commitId"
              }
            ]
          }
        },
        {
          "name": "sender",
          "writable": true,
          "relations": [
            "phtlc"
          ]
        },
        {
          "name": "tokenContract",
          "relations": [
            "phtlc"
          ]
        },
        {
          "name": "senderTokenAccount",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "commitId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "phtlcBump",
          "type": "u8"
        }
      ],
      "returns": "bool"
    },
    {
      "name": "unlock",
      "docs": [
        "@dev Called by the sender if there was no redeem AND the time lock has",
        "expired. This will unlock the contract amount.",
        "",
        "@param commitId of the HTLC to unlock from."
      ],
      "discriminator": [
        101,
        155,
        40,
        21,
        158,
        189,
        56,
        203
      ],
      "accounts": [
        {
          "name": "userSigning",
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
                "path": "lockId"
              }
            ]
          }
        },
        {
          "name": "htlcTokenAccount",
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
                "path": "lockId"
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
          "name": "tokenContract",
          "relations": [
            "htlc"
          ]
        },
        {
          "name": "senderTokenAccount",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "lockId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "htlcBump",
          "type": "u8"
        }
      ],
      "returns": "bool"
    }
  ],
  "accounts": [
    {
      "name": "commitCounter",
      "discriminator": [
        212,
        48,
        98,
        236,
        88,
        247,
        14,
        230
      ]
    },
    {
      "name": "htlc",
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
    },
    {
      "name": "lockIdStruct",
      "discriminator": [
        97,
        193,
        114,
        198,
        198,
        10,
        156,
        66
      ]
    },
    {
      "name": "phtlc",
      "discriminator": [
        252,
        8,
        240,
        212,
        38,
        61,
        30,
        242
      ]
    }
  ],
  "events": [
    {
      "name": "tokenCommitted",
      "discriminator": [
        198,
        227,
        27,
        10,
        43,
        217,
        121,
        127
      ]
    },
    {
      "name": "tokenLocked",
      "discriminator": [
        18,
        238,
        170,
        48,
        2,
        120,
        199,
        224
      ]
    },
    {
      "name": "tokenRedeemed",
      "discriminator": [
        75,
        7,
        43,
        228,
        204,
        167,
        97,
        76
      ]
    },
    {
      "name": "tokenUncommited",
      "discriminator": [
        198,
        49,
        47,
        30,
        198,
        28,
        79,
        14
      ]
    },
    {
      "name": "tokenUnlocked",
      "discriminator": [
        86,
        204,
        216,
        175,
        122,
        181,
        8,
        237
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "notFutureTimeLock",
      "msg": "Not Future TimeLock."
    },
    {
      "code": 6001,
      "name": "notPastTimeLock",
      "msg": "Not Past TimeLock."
    },
    {
      "code": 6002,
      "name": "hashlockNoMatch",
      "msg": "Does Not Match the Hashlock."
    },
    {
      "code": 6003,
      "name": "alreadyRedeemed",
      "msg": "Funds Are Alredy Redeemed."
    },
    {
      "code": 6004,
      "name": "alreadyUnlocked",
      "msg": "Funds Are Alredy Unlocked."
    },
    {
      "code": 6005,
      "name": "alreadyUncommitted",
      "msg": "Funds Are Alredy Uncommitted."
    },
    {
      "code": 6006,
      "name": "alreadyLocked",
      "msg": "Already Locked."
    },
    {
      "code": 6007,
      "name": "fundsNotSent",
      "msg": "Funds Can Not Be Zero."
    },
    {
      "code": 6008,
      "name": "unauthorizedAccess",
      "msg": "Unauthorized Access."
    },
    {
      "code": 6009,
      "name": "notOwner",
      "msg": "Not The Owner."
    },
    {
      "code": 6010,
      "name": "notSender",
      "msg": "Not The Sender."
    },
    {
      "code": 6011,
      "name": "notReciever",
      "msg": "Not The Reciever."
    },
    {
      "code": 6012,
      "name": "noToken",
      "msg": "Wrong Token."
    }
  ],
  "types": [
    {
      "name": "commitCounter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "count",
            "type": "u64"
          },
          {
            "name": "time",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "htlc",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "dstAddress",
            "type": "string"
          },
          {
            "name": "dstChain",
            "type": "string"
          },
          {
            "name": "dstAsset",
            "type": "string"
          },
          {
            "name": "srcAsset",
            "type": "string"
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "srcReceiver",
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
            "type": "bytes"
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
            "name": "tokenContract",
            "type": "pubkey"
          },
          {
            "name": "tokenWallet",
            "type": "pubkey"
          },
          {
            "name": "redeemed",
            "type": "bool"
          },
          {
            "name": "unlocked",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "lockIdStruct",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lockId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "phtlc",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "dstAddress",
            "type": "string"
          },
          {
            "name": "dstChain",
            "type": "string"
          },
          {
            "name": "dstAsset",
            "type": "string"
          },
          {
            "name": "srcAsset",
            "type": "string"
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "srcReceiver",
            "type": "pubkey"
          },
          {
            "name": "lockId",
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
            "name": "messenger",
            "type": "pubkey"
          },
          {
            "name": "tokenContract",
            "type": "pubkey"
          },
          {
            "name": "tokenWallet",
            "type": "pubkey"
          },
          {
            "name": "locked",
            "type": "bool"
          },
          {
            "name": "uncommitted",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "tokenCommitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commitId",
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
            "name": "dstChain",
            "type": "string"
          },
          {
            "name": "dstAddress",
            "type": "string"
          },
          {
            "name": "dstAsset",
            "type": "string"
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "srcReceiver",
            "type": "pubkey"
          },
          {
            "name": "srcAsset",
            "type": "string"
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
            "name": "messenger",
            "type": "pubkey"
          },
          {
            "name": "tokenContract",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "tokenLocked",
      "type": {
        "kind": "struct",
        "fields": [
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
            "name": "dstChain",
            "type": "string"
          },
          {
            "name": "dstAddress",
            "type": "string"
          },
          {
            "name": "dstAsset",
            "type": "string"
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "srcReceiver",
            "type": "pubkey"
          },
          {
            "name": "srcAsset",
            "type": "string"
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
            "name": "messenger",
            "type": "pubkey"
          },
          {
            "name": "commitId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "tokenContract",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "tokenRedeemed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lockId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "redeemAddress",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "tokenUncommited",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commitId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "tokenUnlocked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lockId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    }
  ]
};
