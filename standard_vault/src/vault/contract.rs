use anyhow::{anyhow, Result};
use bitcoin::absolute::LockTime;
use bitcoin::consensus::Encodable;
use bitcoin::hashes::{sha256, Hash};
use bitcoin::hex::{Case, DisplayHex};
use bitcoin::key::{Keypair, Secp256k1};
use bitcoin::secp256k1::{rand, Message, SecretKey, ThirtyTwoByteHash};
use bitcoin::sighash::{Prevouts, SighashCache};
use bitcoin::taproot::{LeafVersion, Signature, TaprootBuilder, TaprootSpendInfo};
use bitcoin::transaction::Version;
use bitcoin::{
    Address, Amount, Network, OutPoint, Sequence, TapLeafHash, TapSighashType, Transaction, TxIn,
    TxOut, XOnlyPublicKey,
};
use bitcoincore_rpc::jsonrpc::serde_json;
use log::{debug, info};
use secp256kfun::marker::{EvenY, NonZero, Public};
use secp256kfun::{Point, G};
use serde::{Deserialize, Serialize};
use std::str::FromStr;

use crate::settings::Settings;
use crate::vault::script::{vault_emergency_timeout, vault_liquidate, vault_repay};
use crate::vault::signature_building;
use crate::vault::signature_building::{get_sigmsg_components, TxCommitmentSpec};

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
pub(crate) enum VaultState {
    Inactive,
    Active,
    Repaid,
    Liquidated,
}

#[derive(Serialize, Deserialize)]
pub(crate) struct VaultCovenant {
    current_outpoint: Option<OutPoint>,
    amount: Amount,
    network: Network,
    pub(crate) timelock_in_blocks: u16,
    state: VaultState,
    user_keypair: Keypair,
    oracle_keypair: Keypair,
    liquidation_pool_address: Option<String>,
}

impl Default for VaultCovenant {
    fn default() -> Self {
        let secp = Secp256k1::new();
        Self {
            current_outpoint: None,
            amount: Amount::ZERO,
            network: Network::Regtest,
            timelock_in_blocks: 20,
            state: VaultState::Inactive,
            user_keypair: Keypair::new(&secp, &mut rand::thread_rng()),
            oracle_keypair: Keypair::new(&secp, &mut rand::thread_rng()),
            liquidation_pool_address: None,
        }
    }
}

impl VaultCovenant {
    pub(crate) fn new(timelock_in_blocks: u16, settings: &Settings) -> Result<Self> {
        let secp = Secp256k1::new();
        let oracle_keypair = if let Some(sk_hex) = settings
            .oracle_private_key_hex
            .as_ref()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
        {
            let secret_key = SecretKey::from_str(sk_hex)
                .map_err(|e| anyhow!("invalid oracle_private_key_hex in settings: {}", e))?;
            Keypair::from_secret_key(&secp, &secret_key)
        } else {
            Keypair::new(&secp, &mut rand::thread_rng())
        };

        Ok(Self {
            network: settings.network,
            timelock_in_blocks,
            oracle_keypair,
            ..Default::default()
        })
    }

    pub(crate) fn from_file(filename: &Option<String>) -> Result<Self> {
        let filename = filename
            .clone()
            .unwrap_or("vault_covenant.json".to_string());
        info!("reading vault covenant from file: {}", filename);
        let file = std::fs::File::open(filename)?;
        let covenant: VaultCovenant = serde_json::from_reader(file)?;
        Ok(covenant)
    }

    pub(crate) fn to_file(&self, filename: &Option<String>) -> Result<()> {
        let filename = filename
            .clone()
            .unwrap_or("vault_covenant.json".to_string());
        info!("writing vault covenant to file: {}", filename);
        let file = std::fs::File::create(filename)?;
        serde_json::to_writer(file, self)?;
        Ok(())
    }

    pub(crate) fn set_current_outpoint(&mut self, outpoint: OutPoint) {
        self.current_outpoint = Some(outpoint);
    }

    pub(crate) fn get_current_outpoint(&self) -> Result<OutPoint> {
        self.current_outpoint.ok_or(anyhow!("no current outpoint"))
    }

    pub(crate) fn set_amount(&mut self, amount: Amount) {
        self.amount = amount;
    }

    pub(crate) fn set_state(&mut self, state: VaultState) {
        self.state = state;
    }

    pub(crate) fn get_state(&self) -> VaultState {
        self.state.clone()
    }

    pub(crate) fn set_liquidation_pool_address(&mut self, address: Option<Address>) {
        self.liquidation_pool_address = address.map(|a| a.to_string());
    }

    pub(crate) fn get_liquidation_pool_address(&self) -> Result<Address> {
        Ok(Address::from_str(
            self.liquidation_pool_address
                .as_ref()
                .ok_or(anyhow!("no liquidation pool address configured"))?,
        )?
        .require_network(self.network)?)
    }

    pub(crate) fn address(&self) -> Result<Address> {
        let spend_info = self.taproot_spend_info()?;
        Ok(Address::p2tr_tweaked(spend_info.output_key(), self.network))
    }

    /// Oracle x-only public key — embedded in vault_liquidate and vault_repay scripts.
    /// The Chainlink CRE node holds the corresponding private key.
    pub(crate) fn oracle_x_only_public_key(&self) -> XOnlyPublicKey {
        self.oracle_keypair.x_only_public_key().0
    }

    fn user_x_only_public_key(&self) -> XOnlyPublicKey {
        self.user_keypair.x_only_public_key().0
    }

    fn taproot_spend_info(&self) -> Result<TaprootSpendInfo> {
        // NUMS (Nothing Up My Sleeve) point — disables key-path spend.
        // Derived by hashing G so no one knows the discrete log.
        let hash = sha256::Hash::hash(G.to_bytes_uncompressed().as_slice());
        let point: Point<EvenY, Public, NonZero> = Point::from_xonly_bytes(hash.into_32())
            .ok_or(anyhow!("G_X hash should be a valid x-only point"))?;
        let nums_key = XOnlyPublicKey::from_slice(point.to_xonly_bytes().as_slice())?;

        let liq_pool_addr = self.get_liquidation_pool_address().unwrap_or_else(|_| {
            // Fallback NUMS address if not configured yet — will be replaced before deposit.
            Address::p2tr_tweaked(
                bitcoin::key::TweakedPublicKey::dangerous_assume_tweaked(nums_key),
                self.network,
            )
        });

        let secp = Secp256k1::new();
        Ok(TaprootBuilder::new()
            // Leaf A: Repay — at depth 1 (most-used path, smallest Merkle proof)
            .add_leaf(
                1,
                vault_repay(
                    self.user_x_only_public_key(),
                    self.oracle_x_only_public_key(),
                ),
            )?
            // Leaf B: Liquidate — at depth 2 (OP_CAT covenant, oracle-triggered)
            .add_leaf(
                2,
                vault_liquidate(
                    self.oracle_x_only_public_key(),
                    &liq_pool_addr.script_pubkey(),
                ),
            )?
            // Leaf C: Emergency timeout — at depth 2 (user unilateral after timelock)
            .add_leaf(
                2,
                vault_emergency_timeout(self.user_x_only_public_key(), self.timelock_in_blocks),
            )?
            .finalize(&secp, nums_key)
            .expect("finalizing taproot spend info with a NUMS point should always work"))
    }

    /// Sign a transaction input (index 0) using the given keypair under script-path spending.
    fn sign_with_keypair(
        &self,
        keypair: &Keypair,
        txn: &Transaction,
        prevouts: &[TxOut],
        leaf_hash: TapLeafHash,
    ) -> Vec<u8> {
        let secp = Secp256k1::new();
        let mut sighashcache = SighashCache::new(txn);
        let sighash = sighashcache
            .taproot_script_spend_signature_hash(
                0,
                &Prevouts::All(prevouts),
                leaf_hash,
                TapSighashType::Default,
            )
            .unwrap();
        let message = Message::from_digest_slice(sighash.as_byte_array()).unwrap();
        let signature = secp.sign_schnorr(&message, keypair);
        let final_sig = Signature {
            sig: signature,
            hash_ty: TapSighashType::Default,
        };
        final_sig.to_vec()
    }

    /// Leaf A: Create the repayment transaction.
    ///
    /// Both the oracle (CRE confirms debt cleared on Starknet) and the user must sign.
    /// No OP_CAT needed — Schnorr signatures commit to the specific transaction outputs.
    /// The user controls where their BTC goes (output to `user_destination`).
    ///
    /// Witness: [user_sig, oracle_sig, script, control_block]
    pub(crate) fn create_repay_tx(
        &self,
        fee_paying_utxo: &OutPoint,
        fee_paying_output: TxOut,
        user_destination: &Address,
    ) -> Result<Transaction> {
        let mut vault_txin = TxIn {
            previous_output: self
                .current_outpoint
                .ok_or(anyhow!("no current outpoint"))?,
            ..Default::default()
        };
        let fee_txin = TxIn {
            previous_output: *fee_paying_utxo,
            ..Default::default()
        };

        let user_output = TxOut {
            script_pubkey: user_destination.script_pubkey(),
            value: self.amount,
        };

        // No fee change output — fee_paying_output.value is the full UTXO, all goes to miners.
        let txn = Transaction {
            lock_time: LockTime::ZERO,
            version: Version::TWO,
            input: vec![vault_txin.clone(), fee_txin],
            output: vec![user_output.clone()],
        };

        let vault_txout = TxOut {
            script_pubkey: self.address()?.script_pubkey(),
            value: self.amount,
        };
        let leaf_hash = TapLeafHash::from_script(
            &vault_repay(
                self.user_x_only_public_key(),
                self.oracle_x_only_public_key(),
            ),
            LeafVersion::TapScript,
        );
        // prevouts must match the actual UTXOs being spent (input values, not output values)
        let prevouts = [vault_txout.clone(), fee_paying_output.clone()];

        // Oracle signs first (CRE confirms debt cleared on Starknet)
        let oracle_sig = self.sign_with_keypair(&self.oracle_keypair, &txn, &prevouts, leaf_hash);
        // User signs (authorizes the destination)
        let user_sig = self.sign_with_keypair(&self.user_keypair, &txn, &prevouts, leaf_hash);

        // Script: <oracle_key> OP_CHECKSIGVERIFY <user_key> OP_CHECKSIG
        // OP_CHECKSIGVERIFY pops the top of stack → oracle_sig must be on top (index 1).
        // OP_CHECKSIG then pops the new top → user_sig must be at bottom (index 0).
        vault_txin.witness.push(user_sig); // index 0 (bottom): consumed by CHECKSIG
        vault_txin.witness.push(oracle_sig); // index 1 (top): consumed by CHECKSIGVERIFY

        let repay_script = vault_repay(
            self.user_x_only_public_key(),
            self.oracle_x_only_public_key(),
        );
        vault_txin.witness.push(repay_script.to_bytes());
        vault_txin.witness.push(
            self.taproot_spend_info()?
                .control_block(&(repay_script.clone(), LeafVersion::TapScript))
                .expect("control block should work")
                .serialize(),
        );

        let mut txn = txn;
        txn.input.first_mut().unwrap().witness = vault_txin.witness.clone();
        Ok(txn)
    }

    /// Leaf B: Create the liquidation transaction (OP_CAT covenant path).
    ///
    /// Only the oracle signs (CRE confirms health factor < 1). The OP_CAT covenant in the
    /// script cryptographically enforces the single output goes to the liquidation pool —
    /// even a compromised oracle cannot redirect funds elsewhere.
    ///
    /// This uses the same CAT+Schnorr sighash introspection trick for output enforcement.
    /// The witness encoding mirrors the cancel-withdrawal pattern exactly, with:
    ///   - output to liquidation_pool_address (not vault itself)
    ///   - oracle_keypair for signing (not vault keypair)
    pub(crate) fn create_liquidate_tx(
        &self,
        fee_paying_utxo: &OutPoint,
        fee_paying_output: TxOut,
    ) -> Result<Transaction> {
        let liq_pool_address = self.get_liquidation_pool_address()?;

        let mut vault_txin = TxIn {
            previous_output: self
                .current_outpoint
                .ok_or(anyhow!("no current outpoint"))?,
            ..Default::default()
        };
        let fee_txin = TxIn {
            previous_output: *fee_paying_utxo,
            ..Default::default()
        };

        // Single output: full vault amount goes to liquidation pool
        let liq_output = TxOut {
            script_pubkey: liq_pool_address.script_pubkey(),
            value: self.amount,
        };

        let txn = Transaction {
            lock_time: LockTime::ZERO,
            version: Version::TWO,
            input: vec![vault_txin.clone(), fee_txin],
            output: vec![liq_output.clone()],
        };

        // Same spec as cancel_withdrawal: exclude prev_scriptpubkeys, prev_amounts,
        // input_index, and outputs — all reconstructed in-script via OP_CAT.
        let tx_commitment_spec = TxCommitmentSpec {
            prev_sciptpubkeys: false,
            prev_amounts: false,
            input_index: false,
            outputs: false,
            ..Default::default()
        };

        let liquidate_script = vault_liquidate(
            self.oracle_x_only_public_key(),
            &liq_pool_address.script_pubkey(),
        );
        let leaf_hash = TapLeafHash::from_script(&liquidate_script, LeafVersion::TapScript);

        let vault_txout = TxOut {
            script_pubkey: self.address()?.script_pubkey(),
            value: self.amount,
        };
        let prevouts = [vault_txout.clone(), fee_paying_output.clone()];

        let contract_components = signature_building::grind_transaction(
            txn,
            signature_building::GrindField::LockTime,
            &prevouts,
            leaf_hash,
        )?;

        let mut txn = contract_components.transaction;
        let witness_components = get_sigmsg_components(
            &tx_commitment_spec,
            &txn,
            0,
            &prevouts,
            None,
            leaf_hash,
            TapSighashType::Default,
        )?;

        for component in witness_components.iter() {
            debug!(
                "pushing component <0x{}> into the witness",
                component.to_hex_string(Case::Lower)
            );
            vault_txin.witness.push(component.as_slice());
        }

        // Push vault_amount: used by script as both output amount and prev_amounts entry
        // (the script does OP_DUP internally to make two copies).
        let mut amount_buffer = Vec::new();
        self.amount.consensus_encode(&mut amount_buffer)?;
        vault_txin.witness.push(amount_buffer.as_slice());

        // Push vault_spk: used by script for prev_scriptpubkeys only.
        // The output spk (liq_pool_spk) is hardcoded inside vault_liquidate script — the covenant.
        let mut vault_spk_buffer = Vec::new();
        vault_txout
            .script_pubkey
            .consensus_encode(&mut vault_spk_buffer)?;
        vault_txin.witness.push(vault_spk_buffer.as_slice());

        // Push fee fields
        let mut fee_amount_buffer = Vec::new();
        fee_paying_output
            .value
            .consensus_encode(&mut fee_amount_buffer)?;
        vault_txin.witness.push(fee_amount_buffer.as_slice());
        let mut fee_spk_buffer = Vec::new();
        fee_paying_output
            .script_pubkey
            .consensus_encode(&mut fee_spk_buffer)?;
        vault_txin.witness.push(fee_spk_buffer.as_slice());

        // CAT+Schnorr mangled signature (oracle's authority + covenant proof)
        let computed_signature = signature_building::compute_signature_from_components(
            &contract_components.signature_components,
        )?;
        let mangled_signature: [u8; 63] = computed_signature[0..63].try_into().unwrap();
        vault_txin.witness.push(mangled_signature);
        vault_txin.witness.push([computed_signature[63]]); // last byte
        vault_txin.witness.push([computed_signature[63] + 1]); // last byte + 1

        // Oracle's real Schnorr signature (checked by OP_CHECKSIGVERIFY in script)
        let oracle_sig = self.sign_with_keypair(&self.oracle_keypair, &txn, &prevouts, leaf_hash);
        vault_txin.witness.push(oracle_sig);

        vault_txin.witness.push(liquidate_script.to_bytes());
        vault_txin.witness.push(
            self.taproot_spend_info()?
                .control_block(&(liquidate_script.clone(), LeafVersion::TapScript))
                .expect("control block should work")
                .serialize(),
        );

        txn.input.first_mut().unwrap().witness = vault_txin.witness.clone();
        Ok(txn)
    }

    /// Leaf C: Create the emergency timeout transaction.
    ///
    /// After `timelock_in_blocks` blocks, the user unilaterally recovers funds.
    /// No oracle required — safety valve against CRE liveness failures.
    pub(crate) fn create_timeout_tx(
        &self,
        fee_paying_utxo: &OutPoint,
        fee_paying_output: TxOut,
        user_destination: &Address,
    ) -> Result<Transaction> {
        let mut vault_txin = TxIn {
            previous_output: self
                .current_outpoint
                .ok_or(anyhow!("no current outpoint"))?,
            // CSV requires the input sequence to signal the relative timelock
            sequence: Sequence::from_height(self.timelock_in_blocks),
            ..Default::default()
        };
        let fee_txin = TxIn {
            previous_output: *fee_paying_utxo,
            ..Default::default()
        };

        let user_output = TxOut {
            script_pubkey: user_destination.script_pubkey(),
            value: self.amount,
        };

        // No fee change output — full fee UTXO goes to miners.
        let txn = Transaction {
            lock_time: LockTime::ZERO,
            version: Version::TWO,
            input: vec![vault_txin.clone(), fee_txin],
            output: vec![user_output.clone()],
        };

        let vault_txout = TxOut {
            script_pubkey: self.address()?.script_pubkey(),
            value: self.amount,
        };
        let timeout_script =
            vault_emergency_timeout(self.user_x_only_public_key(), self.timelock_in_blocks);
        let leaf_hash = TapLeafHash::from_script(&timeout_script, LeafVersion::TapScript);
        let prevouts = [vault_txout.clone(), fee_paying_output.clone()];

        let user_sig = self.sign_with_keypair(&self.user_keypair, &txn, &prevouts, leaf_hash);
        vault_txin.witness.push(user_sig);

        vault_txin.witness.push(timeout_script.to_bytes());
        vault_txin.witness.push(
            self.taproot_spend_info()?
                .control_block(&(timeout_script.clone(), LeafVersion::TapScript))
                .expect("control block should work")
                .serialize(),
        );

        let mut txn = txn;
        txn.input.first_mut().unwrap().witness = vault_txin.witness.clone();
        Ok(txn)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use bitcoin::secp256k1::schnorr;
    use bitcoin::{ScriptBuf, Txid};

    fn setup_covenant(vault_amount_sat: u64) -> (VaultCovenant, Address, OutPoint, TxOut) {
        let secp = Secp256k1::new();

        let liquidation_pool_keypair = Keypair::new(&secp, &mut rand::thread_rng());
        let liquidation_pool_address = Address::p2tr(
            &secp,
            liquidation_pool_keypair.x_only_public_key().0,
            None,
            Network::Regtest,
        );

        let fee_spk_keypair = Keypair::new(&secp, &mut rand::thread_rng());
        let fee_script_pubkey = Address::p2tr(
            &secp,
            fee_spk_keypair.x_only_public_key().0,
            None,
            Network::Regtest,
        )
        .script_pubkey();

        let mut covenant = VaultCovenant::default();
        covenant.set_amount(Amount::from_sat(vault_amount_sat));
        covenant.set_current_outpoint(OutPoint::new(Txid::from_slice(&[2u8; 32]).unwrap(), 0));
        covenant.set_liquidation_pool_address(Some(liquidation_pool_address.clone()));

        let fee_paying_utxo = OutPoint::new(Txid::from_slice(&[3u8; 32]).unwrap(), 1);
        let fee_paying_output = TxOut {
            value: Amount::from_sat(2_000),
            script_pubkey: fee_script_pubkey,
        };

        (
            covenant,
            liquidation_pool_address,
            fee_paying_utxo,
            fee_paying_output,
        )
    }

    fn extract_oracle_sig(tx: &Transaction) -> Vec<u8> {
        let witness = &tx.input[0].witness;
        witness
            .nth(witness.len() - 3)
            .expect("oracle signature should be present")
            .to_vec()
    }

    fn liquidate_leaf_hash(covenant: &VaultCovenant, liquidation_spk: &ScriptBuf) -> TapLeafHash {
        TapLeafHash::from_script(
            &vault_liquidate(covenant.oracle_x_only_public_key(), liquidation_spk),
            LeafVersion::TapScript,
        )
    }

    #[test]
    fn liquidation_tx_output_is_fixed_to_liquidation_pool() {
        let (covenant, liquidation_pool_address, fee_paying_utxo, fee_paying_output) =
            setup_covenant(120_000);

        let tx = covenant
            .create_liquidate_tx(&fee_paying_utxo, fee_paying_output)
            .expect("liquidation tx should build");

        assert_eq!(tx.output.len(), 1);
        assert_eq!(
            tx.output[0].script_pubkey,
            liquidation_pool_address.script_pubkey()
        );
    }

    #[test]
    fn liquidation_oracle_signature_breaks_if_output_is_redirected() {
        let (covenant, liquidation_pool_address, fee_paying_utxo, fee_paying_output) =
            setup_covenant(150_000);
        let secp = Secp256k1::new();

        let tx = covenant
            .create_liquidate_tx(&fee_paying_utxo, fee_paying_output.clone())
            .expect("liquidation tx should build");

        let vault_prevout = TxOut {
            script_pubkey: covenant.address().expect("vault address").script_pubkey(),
            value: Amount::from_sat(150_000),
        };
        let prevouts = [vault_prevout, fee_paying_output];
        let leaf_hash = liquidate_leaf_hash(&covenant, &liquidation_pool_address.script_pubkey());

        let oracle_sig_bytes = extract_oracle_sig(&tx);
        let oracle_sig = schnorr::Signature::from_slice(&oracle_sig_bytes)
            .expect("oracle signature must be 64-byte schnorr");

        let mut cache = SighashCache::new(&tx);
        let original_sighash = cache
            .taproot_script_spend_signature_hash(
                0,
                &Prevouts::All(&prevouts),
                leaf_hash,
                TapSighashType::Default,
            )
            .expect("sighash should compute");
        let original_msg = Message::from_digest_slice(original_sighash.as_byte_array()).unwrap();

        assert!(
            secp.verify_schnorr(
                &oracle_sig,
                &original_msg,
                &covenant.oracle_x_only_public_key()
            )
            .is_ok(),
            "original liquidation tx must satisfy oracle signature"
        );

        let attacker_keypair = Keypair::new(&secp, &mut rand::thread_rng());
        let attacker_address = Address::p2tr(
            &secp,
            attacker_keypair.x_only_public_key().0,
            None,
            Network::Regtest,
        );

        let mut redirected_tx = tx;
        redirected_tx.output[0].script_pubkey = attacker_address.script_pubkey();

        let mut tampered_cache = SighashCache::new(&redirected_tx);
        let tampered_sighash = tampered_cache
            .taproot_script_spend_signature_hash(
                0,
                &Prevouts::All(&prevouts),
                leaf_hash,
                TapSighashType::Default,
            )
            .expect("sighash should compute");
        let tampered_msg = Message::from_digest_slice(tampered_sighash.as_byte_array()).unwrap();

        assert!(
            secp.verify_schnorr(
                &oracle_sig,
                &tampered_msg,
                &covenant.oracle_x_only_public_key()
            )
            .is_err(),
            "redirecting liquidation output must invalidate the witness signature"
        );
    }
}
