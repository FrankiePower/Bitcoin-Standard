use crate::vault::signature_building::{BIP0340_CHALLENGE_TAG, G_X, TAPSIGHASH_TAG};
use bitcoin::consensus::Encodable;
use bitcoin::opcodes::all::{
    OP_CAT, OP_CHECKSIG, OP_CHECKSIGVERIFY, OP_CSV, OP_DROP, OP_DUP, OP_EQUALVERIFY,
    OP_FROMALTSTACK, OP_ROT, OP_SHA256, OP_SWAP, OP_TOALTSTACK,
};
use bitcoin::script::{Builder, PushBytesBuf};
use bitcoin::{Script, ScriptBuf, Sequence, XOnlyPublicKey};

/// Leaf A: Repay path.
///
/// Requires oracle signature (CRE confirms debt cleared on Starknet) AND user signature.
/// No OP_CAT needed — both Schnorr signatures commit to the same transaction outputs,
/// so the user freely chooses the destination (vault BTC returns to them).
///
/// Witness (bottom → top): oracle_sig, user_sig, script, control_block
pub(crate) fn vault_repay(
    user_x_only_key: XOnlyPublicKey,
    oracle_x_only_key: XOnlyPublicKey,
) -> ScriptBuf {
    Script::builder()
        .push_x_only_key(&oracle_x_only_key)
        .push_opcode(OP_CHECKSIGVERIFY) // oracle must sign (CRE confirms debt cleared)
        .push_x_only_key(&user_x_only_key)
        .push_opcode(OP_CHECKSIG) // user must sign (authorizes destination)
        .into_script()
}

/// Leaf B: Liquidation path.
///
/// Requires oracle signature (CRE confirms health factor < 1) + an OP_CAT covenant that
/// cryptographically enforces the single output goes to `liquidation_pool_spk`.
/// Even a compromised oracle cannot redirect funds elsewhere — the covenant is in Bitcoin Script.
///
/// `liquidation_pool_spk`: ScriptBuf of the liquidation pool address (consensus-encoded in script).
///
/// Witness layout (bottom → top, excluding script/control_block):
///   sigcomps[0..n]: epoch, control, version, locktime, prevouts, sequences,
///                   spend_type, leaf_hash, key_version_0, code_sep_pos
///   vault_amount
///   vault_spk
///   fee_amount
///   fee_spk
///   mangled_sig (63 bytes — sig[0..63])
///   last_byte   (sig[63])
///   last_byte+1 (sig[63]+1)
///   oracle_sig  ← TOP (verified by CHECKSIGVERIFY)
pub(crate) fn vault_liquidate(
    oracle_x_only_key: XOnlyPublicKey,
    liquidation_pool_spk: &ScriptBuf,
) -> ScriptBuf {
    // Consensus-encode the liquidation pool scriptpubkey (varint length prefix + bytes).
    // This is the same encoding used for prev_scriptpubkeys in the sighash preimage.
    let mut encoded_spk = Vec::new();
    liquidation_pool_spk
        .consensus_encode(&mut encoded_spk)
        .expect("scriptpubkey consensus encoding should not fail");
    let spk_push =
        PushBytesBuf::try_from(encoded_spk).expect("liquidation pool spk fits in script push");

    let mut builder = Script::builder();
    builder = builder
        .push_x_only_key(&oracle_x_only_key)
        .push_opcode(OP_CHECKSIGVERIFY) // oracle must sign (CRE confirms under-collateralized)
        // Move sig bookkeeping off the main stack
        .push_opcode(OP_TOALTSTACK) // sig-63 → altstack
        .push_opcode(OP_TOALTSTACK) // last_byte → altstack
        .push_opcode(OP_TOALTSTACK) // last_byte+1 → altstack
        .push_opcode(OP_TOALTSTACK) // fee_spk → altstack
        .push_opcode(OP_TOALTSTACK) // fee_amount → altstack
        // Stack now: vault_spk (top), vault_amount, sigcomps...
        //
        // Set up altstack for the four FROMALTSTACK calls during sighash reconstruction.
        // FROMALTSTACK is LIFO, so push in reverse order of consumption:
        //   push vault_spk  (consumed 4th — prev_scriptpubkeys)
        //   push vault_amount copy (consumed 3rd — prev_amounts)
        //   push liq_pool_spk     (consumed 2nd — output spk, hardcoded covenant)
        //   push vault_amount     (consumed 1st — output amount)
        .push_opcode(OP_TOALTSTACK) // vault_spk → altstack (for prev_scriptpubkeys)
        .push_opcode(OP_DUP) // duplicate vault_amount for two uses
        .push_opcode(OP_TOALTSTACK) // vault_amount copy → altstack (for prev_amounts)
        .push_slice(&spk_push) // hardcoded liquidation pool spk (the covenant!)
        .push_opcode(OP_TOALTSTACK) // liq_pool_spk → altstack (for output spk)
        .push_opcode(OP_TOALTSTACK) // vault_amount → altstack (for output amount)
        // Stack now: code_sep_pos (top), key_version_0, leaf_hash, spend_type, sequences,
        //            prevouts, locktime, version, control, epoch (bottom)
        //
        // Reconstruct sighash preimage via OP_CAT — identical to vault_cancel_withdrawal.
        .push_opcode(OP_CAT) // key_version_0 || code_sep_pos
        .push_opcode(OP_CAT) // leaf_hash || key_version_0 || code_sep_pos
        .push_slice([0x00u8, 0x00u8, 0x00u8, 0x00u8]) // input_index = 0
        .push_opcode(OP_SWAP)
        .push_opcode(OP_CAT) // input_index || leaf_hash || ...
        .push_opcode(OP_CAT) // spend_type || input_index || leaf_hash || ...
        // Reconstruct sha_outputs: sha256(vault_amount || liq_pool_spk)
        // The liq_pool_spk coming from altstack is hardcoded in this script — that is the covenant.
        .push_opcode(OP_FROMALTSTACK) // vault_amount (output amount)
        .push_opcode(OP_FROMALTSTACK) // liq_pool_spk (output spk — enforced by covenant!)
        .push_opcode(OP_CAT) // vault_amount || liq_pool_spk
        .push_opcode(OP_SHA256) // sha256(single output)
        .push_opcode(OP_SWAP)
        .push_opcode(OP_CAT) // sha_outputs || working_sigmsg
        .push_opcode(OP_CAT) // sequences || sha_outputs || ...
        // Reconstruct sha_scriptpubkeys: sha256(vault_spk || fee_spk)
        .push_opcode(OP_FROMALTSTACK) // vault_amount copy (for prev_amounts, held temporarily)
        .push_opcode(OP_FROMALTSTACK) // vault_spk (for prev_scriptpubkeys)
        .push_opcode(OP_FROMALTSTACK) // fee_amount
        .push_opcode(OP_FROMALTSTACK) // fee_spk
        .push_opcode(OP_SWAP) // fee_spk below fee_amount
        .push_opcode(OP_TOALTSTACK) // fee_amount → altstack (for sha_amounts later)
        .push_opcode(OP_CAT) // vault_spk || fee_spk
        .push_opcode(OP_SWAP) // vault_amount copy to top
        .push_opcode(OP_TOALTSTACK) // vault_amount → altstack (for sha_amounts later)
        .push_opcode(OP_SHA256) // sha_scriptpubkeys
        .push_opcode(OP_SWAP)
        .push_opcode(OP_CAT) // sha_scriptpubkeys || ...
        // Reconstruct sha_amounts: sha256(vault_amount || fee_amount)
        .push_opcode(OP_FROMALTSTACK) // vault_amount
        .push_opcode(OP_FROMALTSTACK) // fee_amount
        .push_opcode(OP_CAT) // vault_amount || fee_amount
        .push_opcode(OP_SHA256) // sha_amounts
        .push_opcode(OP_SWAP)
        .push_opcode(OP_CAT) // sha_amounts || ...
        .push_opcode(OP_CAT) // prevouts || ...
        .push_opcode(OP_CAT) // locktime || ...
        .push_opcode(OP_CAT) // version || ...
        .push_opcode(OP_CAT) // control || ...
        .push_opcode(OP_CAT); // epoch — full sighash preimage complete

    builder = add_signature_construction_and_check(builder);
    builder.into_script()
}

/// Leaf C: Emergency timeout path.
///
/// After `timelock_in_blocks` blocks, the user can unilaterally recover funds.
/// Safety valve against oracle liveness failures (CRE goes offline, key lost, etc.).
///
/// Witness (bottom → top): user_sig, script, control_block
pub(crate) fn vault_emergency_timeout(
    user_x_only_key: XOnlyPublicKey,
    timelock_in_blocks: u16,
) -> ScriptBuf {
    Script::builder()
        .push_sequence(Sequence::from_height(timelock_in_blocks))
        .push_opcode(OP_CSV)
        .push_opcode(OP_DROP)
        .push_x_only_key(&user_x_only_key)
        .push_opcode(OP_CHECKSIG)
        .into_script()
}

/// Assumes the builder has the full sighash preimage on the stack (after CAT'ing epoch),
/// and the pre-computed mangled signature on the altstack.
///
/// Uses the CAT+Schnorr trick (P=G, R=G) to verify the witness correctly encodes
/// the transaction's sighash, then does a real OP_CHECKSIG against G to enforce it.
pub(crate) fn add_signature_construction_and_check(builder: Builder) -> Builder {
    builder
        .push_slice(*TAPSIGHASH_TAG) // push TapSighash tag
        .push_opcode(OP_SHA256) // hash tag
        .push_opcode(OP_DUP) // dup hashed tag
        .push_opcode(OP_ROT) // move sighash preimage to top
        .push_opcode(OP_CAT)
        .push_opcode(OP_CAT)
        .push_opcode(OP_SHA256) // tagged hash of sighash preimage = sigmsg
        .push_slice(*BIP0340_CHALLENGE_TAG) // push BIP0340/challenge tag
        .push_opcode(OP_SHA256)
        .push_opcode(OP_DUP)
        .push_opcode(OP_ROT) // bring sigmsg to top
        .push_slice(*G_X) // G used as both pubkey (P) and nonce (R)
        .push_opcode(OP_DUP)
        .push_opcode(OP_DUP)
        .push_opcode(OP_DUP)
        .push_opcode(OP_TOALTSTACK) // save G copy (R value for final CHECKSIG)
        .push_opcode(OP_TOALTSTACK) // save G copy (pubkey for final CHECKSIG)
        .push_opcode(OP_ROT) // bring sigmsg to top
        .push_opcode(OP_CAT)
        .push_opcode(OP_CAT)
        .push_opcode(OP_CAT)
        .push_opcode(OP_CAT) // BIP340_tag || BIP340_tag || G_X || G_X || sigmsg
        .push_opcode(OP_SHA256) // s = challenge = hash(G, G, sigmsg)
        .push_opcode(OP_FROMALTSTACK) // G (R value for constructed sig)
        .push_opcode(OP_SWAP)
        .push_opcode(OP_CAT) // constructed sig = G_X || challenge
        .push_opcode(OP_FROMALTSTACK) // G (pubkey for CHECKSIG)
        .push_opcode(OP_FROMALTSTACK) // sig-63 (pre-computed mangled sig, 63 bytes)
        .push_opcode(OP_ROT) // move G below sig-63 and constructed sig
        .push_opcode(OP_SWAP) // sig-63 on top
        .push_opcode(OP_DUP) // need second copy for actual CHECKSIG
        .push_opcode(OP_FROMALTSTACK) // last_byte (sig[63] = challenge's last byte)
        .push_opcode(OP_CAT) // sig-63 || last_byte = G_X || challenge (pre-computed)
        .push_opcode(OP_ROT) // bring script-computed sig to top
        .push_opcode(OP_EQUALVERIFY) // verify pre-computed matches script-computed
        .push_opcode(OP_FROMALTSTACK) // last_byte+1 (= s = challenge+1, actual valid s)
        .push_opcode(OP_CAT) // sig-63 || (last_byte+1) = G_X || s (valid Schnorr sig)
        .push_opcode(OP_SWAP) // bring G (pubkey) to top
        .push_opcode(OP_CHECKSIG) // verify (G_X || s) is valid under pubkey G
}
