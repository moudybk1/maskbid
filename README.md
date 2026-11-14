# MaskBid

**Sealed-bid auctions where only the winning bid is ever revealed. Built on NEAR, ranked inside a TEE.**

[Live demo](https://maskbid.vercel.app) · [Testnet contract](https://testnet.nearblocks.io/address/maskbid-v2.testnet) · Track: Privacy & Private AI · NEAR Hackathon

On a public chain every bid is visible the moment it is sent. Late bidders copy it or outbid by one unit, and honest
bidders shade their price. Commit-reveal hides the amount but needs a second transaction from every bidder and lets a
loser refuse to reveal. A trusted operator hides it but can read or drop bids.

MaskBid keeps **one transaction per bidder**, commits the **complete bid set** on chain, and has the contract itself call
a TEE to rank it. Losing bids are never published, and the contract accepts a result only for that exact set.

| Landing | Evidence for a settled lot |
| --- | --- |
| ![Landing page](release/screenshots/03-landing.jpg) | ![Evidence page](release/screenshots/07-evidence.jpg) |

## How it works

```
bidder's browser                 maskbid-v2.testnet (NEAR)                  outlayer.testnet (TEE)
────────────────                 ─────────────────────────                  ──────────────────────
encrypt amount (AES-256-GCM,
key wrapped RSA-OAEP-2048)
        │  ft_transfer_call: deposit + 490-byte envelope, one tx
        └──────────────────────▶ keeps envelope, extends ordered
                                 keccak digest of every bid
                                        │  after close: request_settlement
                                        └──────────────────────────────────▶ pinned solver (hash-locked wasm)
                                                                              decrypts the whole set, ranks it
                                 checks result against digest, count,  ◀───── canonical result, one winner
                                 key, config and code hash
                                        │
                                        ▼
                    winner pays remainder and gets the token in the same call;
                    every other deposit is refundable at once
```

1. **Lock and seal.** The deposit and the encrypted bid travel in one transaction; the browser checks the receipt's
   commitment against the one it computed.
2. **Commit the set.** Every accepted bid extends one ordered digest, so the full set is pinned before anyone ranks it.
3. **Rank privately.** The solver runs in an OutLayer TEE, decrypts the whole set and ranks it. A missing, reordered or
   altered bid stops the run; there is never a partial winner.
4. **Settle at once.** Winner pays `winning bid - deposit` and receives the token; the seller receives exactly the winning
   bid; losers withdraw independently. A winner who never pays forfeits the deposit to the seller.

Everything on chain is one contract. There is no bridge, adapter account, keeper or indexer between a request and its
result: the contract calls OutLayer and takes the answer as the result of that call.

## What is proven so far

| Claim | Evidence |
| --- | --- |
| Complete auctions settle on NEAR testnet with the real TEE | `release/near-testnet-run.json`: key sealed in the TEE, two sealed bids, wrong-deposit bid refunded, TEE ranking, winner paid, loser refunded, contract ends with no locked funds |
| The web app drives the whole flow from a wallet | Lot 2 on v2: two sealed bids from two accounts, settlement from the page, withdraw, pay, claim, via NEAR Connect |
| Recovery paths work | A TEE run that times out is retried from a button (8 attempts per auction); past the deadline anyone can cancel and everyone gets their deposit and asset back |
| Protocol is deterministic across languages | 6 TypeScript tests and the Rust solver reproduce `packages/protocol/vectors/protocol-vectors.json` byte for byte |
| Contract logic | 9 Rust tests; the settlement ones run the real solver library on the contract's own SOLVE input |

## Try it

The fastest way is the hosted demo: **https://maskbid.vercel.app** (NEAR testnet). Or run it yourself, Node 22+ and npm:

```bash
npm install
npm test             # protocol vectors, no other tooling needed
npm run web          # http://localhost:3000, reads and writes the testnet deployment
```

The web app needs no configuration. **Connect account** opens [NEAR Connect](https://github.com/hot-dao/near-selector),
which lists wallets that support testnet (Meteor, Intear, Nightly, Ledger, NEAR CLI and others). The wallet signs every
transaction; the app never sees a key. Then:

1. **Verify** (`/verify`): your account registers itself with simulator assurance in one transaction.
2. **Gas**: about half a NEAR from the [testnet faucet](https://near-faucet.io/). A TEE run attaches 0.1 NEAR and all but
   about 0.0012 comes straight back.
3. **mUSDC**: the button on any lot mints 1,000 test mUSDC.
4. **Bid**: open a live lot, type an amount, sign one transfer. **Sell**: register an asset, get it approved by the
   verifier, publish a lot.

Contract work needs Rust with the `wasm32-unknown-unknown` target:

```bash
npm run test:near    # 9 tests
npm run build:near   # contracts/dist/maskbid.wasm and mock_usdc.wasm
npm run near:testnet # one full auction against the testnet deployment (about ten minutes)
```

Your own deployment and the VPS/Docker route are in [`deploy/README.md`](deploy/README.md); the contract deploy steps are
under "Deploy your own" below.

## Testnet deployment

| What | Account / value |
| --- | --- |
| MaskBid contract | `maskbid-v2.testnet` (chain id 398) |
| Payment token (mUSDC, 6 decimals, faucet) | `maskbid-usdc.testnet` |
| Admin, registrar, verifier | `maskbid-keeper.testnet` |
| Solver code hash (OutLayer) | `0x785b05898729ec13fe1788c6ca85d07ae084757d15b30ffe51ccaf78cf8f79d4` |
| Config hash | `0x5ecef32a311e5ec83d4e3b348b3392946f4ba848466175a4e9c3261d8f644323` |

Full record: [`contracts/deployments/near-testnet.json`](contracts/deployments/near-testnet.json). v1
(`maskbid.testnet`) is kept on chain with its four settled auctions.

<details>
<summary>Contract design notes</summary>

- One contract holds the participant registry, the asset ledger (one unit per token id, NEP-171 views, `nft_transfer`),
  auctions and the OutLayer calls. A cross-contract read on NEAR is asynchronous, so one state keeps eligibility, asset
  and escrow checks atomic.
- Bid envelopes live in contract state and the contract assembles the solver manifest itself, so nobody submits a
  manifest and no log indexer is needed for settlement.
- A NEAR account takes the 20-byte address slot as the last 20 bytes of `keccak256(account id)` (`address_of` view); protocol
  v1 is unchanged from the first build.
- The solver is pinned to `maskbid-v2.testnet` as its only caller (`PINNED_CALLER`, `manifest.json`).
- Each OutLayer run is paid by the caller through `executionDeposit` (0.1 NEAR on testnet); the unused part is refunded.
- A payout whose token transfer fails becomes a credit, claimed with `withdraw_credit`.

</details>

<details>
<summary>Deploy your own</summary>

With [near-cli-rs](https://github.com/near/near-cli-rs) and three testnet accounts (contract, token, operator):

```bash
npm run build:near                       # contracts/dist/maskbid.wasm, mock_usdc.wasm
# 1. set PINNED_CALLER in apps/private-solver/src/main.rs and "callers" in manifest.json to your contract account
apps/private-solver/build.sh             # prints SOLVER_CODE_HASH
scripts/fastfs-upload.py apps/private-solver/dist/maskbid-private-solver.wasm <operator>.testnet   # prints the wasm url
# 2. deploy the token with init `new {}` and the contract with init `new { admin, registrar, verifier, token,
#    outlayer: "outlayer.testnet", wasm_url, wasm_hash, chain_id: 398, profile: "demo", allow_simulator: true,
#    execution_deposit: "100000000000000000000000" }`, then `storage_deposit` the contract account on the token
npm run near:testnet                     # one full auction against the deployment in scripts/near-testnet.mjs
```

</details>

## Repository map

| Path | What |
| --- | --- |
| `contracts/maskbid`, `contracts/mock-usdc` | NEAR contracts (Rust, near-sdk): the auction and the NEP-141 test token |
| `apps/private-solver` | Rust `wasm32-wasip2` guest that runs in the OutLayer TEE: key generation, decrypt, rank, canonical result |
| `apps/web` | Next.js 16 app: landing page, catalog, sealed-bid dialog (browser-side encryption), evidence page, seller flow, verifier queue |
| `packages/protocol` | TypeScript protocol v1: amount grammar, hashes, 490-byte envelope, manifest checks, deterministic ranking |
| `scripts/near-testnet.mjs` | End-to-end auction against the deployment, with recovery driver |
| `deploy/` | Docker + Caddy VPS deployment, one-command bootstrap |
| `release/` | Evidence: testnet run records, benchmarks, screenshots |
| [`docs/legacy-aurora.md`](docs/legacy-aurora.md) | The first build (Solidity on Aurora, adapter, keeper, indexer) and its gate results. Sources remain in `contracts/src`, `apps/near-adapter`, `apps/keeper`, `apps/indexer`, `apps/solver` |

## Honest limits

- **Simulated proof of personhood.** World ID is not wired in; an account registers itself on this demo deployment, so the
  limit is one bid per account, not per person. The registrar path for a real provider is in the contract.
- **TEE attestation is not verified** by the contract or the web app. The contract pins the solver's code hash and
  OutLayer refuses other bytes, but nothing here checks a TDX quote.
- **Asset review is centralised.** One verifier account approves assets.
- **OutLayer testnet is unreliable.** Runs time out often; the contract records the failure, lets anyone retry, and frees
  deposits and the asset at the settlement deadline if no result arrives.
- **Not audited.** Unit tests and testnet runs, not a review. The no-sale and winner-default paths ran in unit tests only;
  a 32-bid auction has not been run on testnet.
- **Privacy scope.** Bid amounts are hidden; accounts, deposits and timing stay public.
- **No indexer.** Pages read contract views through public RPC nodes, which rate-limit (the hosted demo uses a private
  proxy).

## Credits and license

MIT, see [`LICENSE`](LICENSE). Product design and UI concepts derive from
[UyLeQuoc/MaskBid](https://github.com/UyLeQuoc/MaskBid) (MIT). The NEAR contracts, protocol codec, TEE solver and the
web app were written here, starting 2026-10-23 for the NEAR Hackathon.
