# Local secret handling

Recovery words are wallet-control credentials. The user requested retaining newly created test-wallet credentials; store them privately, never in chat, repository files, ordinary .env files, screenshots, traces, console messages, tool return values or cloud-synced folders. Do not access recovery words for an existing wallet without separate explicit authorization.

The vault helper uses Node's AES-256-GCM with a random 12-byte nonce and authenticated wallet ID/schema. It saves encrypted password/words together in a 0600 file, with a 0700 vault directory, exclusive preparation, serialized atomic updates, file fsync and directory fsync on updates. It refuses to overwrite an existing wallet record. Keep the key separate from vault backups. Encryption does not protect against a compromised user session that can read a local key and vault. For production custody use the user's established offline/hardware process; this skill is for dedicated test wallets.

Prefer a key supplied privately by a secret manager: WALLET_PROVISIONING_VAULT_KEY is a base64-encoded random 32-byte key, not a human password. Never print it. Alternatively generate an exclusive local key in a separately protected directory. Example, run **inside a local script**, with only non-secret references returned:

```js
import {createLocalKey,prepareWallet} from '/absolute/skill/scripts/vault.mjs';
const ref={root:'/private/local/wallet-vaults', id:'metamask-test-001', keyPath:'/private/local/wallet-keys/test.key'};
await createLocalKey(ref.keyPath); // creates once; never overwrites
await prepareWallet(ref);         // random password encrypted before native generation
// Return only walletId/status/vaultPath. Never read/print the key or record plaintext.
```

Use user-specific private directories (for example ~/.local/share/web3-wallet-provision/vaults and a separate local key directory), not the literal example paths. The helper requires private permissions and refuses symlinked key/vault files. It is a small local test utility, not a hardened multiuser keystore or secure-enclave implementation. Its file-based key option protects backup separation and accidental exposure, not a malicious process running as the same user. JavaScript strings cannot be reliably zeroized; the helper clears references/buffers where feasible but makes no memory-erasure guarantee.

Before any UI generation, ensure the key is readable, password record can be saved, profile is new, and no recording tools are active. After capture, authenticate/decrypt the record locally and compare all phrase words in memory; do not print the comparison values. The capture helper performs that verification. Never continue a backup challenge when durable verification failed.

No plaintext export CLI is bundled. To retrieve credentials later, an authorized local deterministic process may use the fill helpers to unlock or complete a native challenge. The user can independently decrypt their backup with the key and documented envelope format, on a private trusted device; do not transmit or echo the decrypted content into this chat. Do not conflate the extension unlock password with the vault key.

For E2E integration, use fillWalletPassword directly before recording. If an existing runner accepts WALLET_TEST_PASSWORD, inject the decrypted password into the child process environment in a local script; never put it in argv, shell tracing, logs or a permanent dotenv file by default. Recovery words are never exported to the E2E runner. Existing explicitly authorized local password files can continue to be used for their existing wallet.
