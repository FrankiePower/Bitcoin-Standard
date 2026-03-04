use std::path::PathBuf;
use std::str::FromStr;

use anyhow::Result;
use bitcoin::consensus::Encodable;
use bitcoin::{Address, Amount, OutPoint, TxOut};
use bitcoincore_rpc::RawTx;
use clap::Parser;
use log::{debug, error, info};

use crate::settings::Settings;
use crate::vault::contract::VaultState;
use crate::vault::contract::VaultCovenant;
use crate::wallet::Wallet;

mod settings;
mod vault;
mod wallet;

#[derive(Parser)]
struct Cli {
    #[arg(short, long, default_value = "settings.toml")]
    settings_file: PathBuf,

    #[command(subcommand)]
    action: Action,
}

#[derive(Parser)]
enum Action {
    /// Fund the vault with BTC (creates the Taproot UTXO)
    Deposit,
    /// Repay debt and recover BTC to <destination> (oracle + user both sign)
    Repay { destination: String },
    /// Oracle-triggered liquidation — sends BTC to the liquidation pool
    Liquidate,
    /// Emergency: user unilaterally recovers BTC after timelock (no oracle needed)
    Timeout { destination: String },
    /// Show vault state
    Status,
}

fn main() -> Result<()> {
    env_logger::init();

    println!("BTCStandard — native Bitcoin CDP vault with OP_CAT covenants");

    let args = Cli::parse();

    let settings = match Settings::from_toml_file(&args.settings_file) {
        Ok(settings) => settings,
        Err(e) => {
            error!("Error reading settings file: {}", e);
            info!(
                "Creating a new settings file at {}",
                args.settings_file.display()
            );
            let settings = Settings::default();
            settings.to_toml_file(&args.settings_file)?;
            settings
        }
    };

    match args.action {
        Action::Deposit => deposit(&settings)?,
        Action::Repay { destination } => repay(&destination, &settings)?,
        Action::Liquidate => liquidate(&settings)?,
        Action::Timeout { destination } => timeout(&destination, &settings)?,
        Action::Status => status(&settings)?,
    }
    Ok(())
}

fn status(settings: &Settings) -> Result<()> {
    let vault = VaultCovenant::from_file(&settings.vault_file).map_err(|e| {
        error!("No vault found: {}.", e);
        error!("Create a vault with the deposit command first.");
        e
    })?;
    info!("Vault state: {:?}", vault.get_state());
    info!("Vault outpoint: {:?}", vault.get_current_outpoint());
    info!(
        "Oracle public key (embed in Chainlink CRE): {}",
        vault.oracle_x_only_public_key()
    );
    Ok(())
}

fn repay(destination: &str, settings: &Settings) -> Result<()> {
    info!("Repaying vault — oracle confirms debt cleared, user recovers BTC");
    let miner_wallet = Wallet::new("miner", settings);
    let fee_wallet = Wallet::new("fee_payment", settings);
    let mut vault = VaultCovenant::from_file(&settings.vault_file)?;

    let user_destination = Address::from_str(destination)?.require_network(settings.network)?;

    let fee_paying_address = fee_wallet.get_new_address()?;
    let fee_paying_utxo = miner_wallet.send(&fee_paying_address, Amount::from_sat(10_000))?;
    miner_wallet.mine_blocks(Some(1))?;

    let repay_tx = vault.create_repay_tx(
        &fee_paying_utxo,
        TxOut {
            script_pubkey: fee_paying_address.script_pubkey(),
            value: Amount::from_sat(10_000), // full UTXO → all goes to miners as fee
        },
        &user_destination,
    )?;
    // Sign the fee input (input[1]) with the fee wallet; vault input[0] is left intact.
    let repay_tx = fee_wallet.sign_tx(&repay_tx)?;

    let mut serialized_tx = Vec::new();
    repay_tx.consensus_encode(&mut serialized_tx).unwrap();
    debug!("serialized repay tx: {:?}", serialized_tx.raw_hex());

    let txid = fee_wallet.broadcast_tx(&serialized_tx, None)?;
    info!("repay txid: {}", txid);
    miner_wallet.mine_blocks(Some(1))?;

    vault.set_current_outpoint(OutPoint { txid, vout: 0 });
    vault.set_state(VaultState::Repaid);
    vault.to_file(&settings.vault_file)?;
    Ok(())
}

fn liquidate(settings: &Settings) -> Result<()> {
    info!("Liquidating vault — oracle confirms under-collateralized, BTC goes to liquidation pool");
    let miner_wallet = Wallet::new("miner", settings);
    let fee_wallet = Wallet::new("fee_payment", settings);
    let mut vault = VaultCovenant::from_file(&settings.vault_file)?;

    let fee_paying_address = fee_wallet.get_new_address()?;
    let fee_paying_utxo = miner_wallet.send(&fee_paying_address, Amount::from_sat(10_000))?;
    miner_wallet.mine_blocks(Some(1))?;

    let liquidate_tx = vault.create_liquidate_tx(
        &fee_paying_utxo,
        TxOut {
            script_pubkey: fee_paying_address.script_pubkey(),
            value: Amount::from_sat(10_000), // full UTXO → all goes to miners as fee
        },
    )?;
    // Sign the fee input (input[1]) with the fee wallet; vault input[0] is left intact.
    let liquidate_tx = fee_wallet.sign_tx(&liquidate_tx)?;

    let mut serialized_tx = Vec::new();
    liquidate_tx.consensus_encode(&mut serialized_tx).unwrap();
    debug!("serialized liquidate tx: {:?}", serialized_tx.raw_hex());

    let txid = fee_wallet.broadcast_tx(&serialized_tx, None)?;
    info!("liquidate txid: {}", txid);
    miner_wallet.mine_blocks(Some(1))?;

    vault.set_current_outpoint(OutPoint { txid, vout: 0 });
    vault.set_state(VaultState::Liquidated);
    vault.to_file(&settings.vault_file)?;
    Ok(())
}

fn timeout(destination: &str, settings: &Settings) -> Result<()> {
    info!("Emergency timeout — user recovers BTC unilaterally after timelock");
    let miner_wallet = Wallet::new("miner", settings);
    let fee_wallet = Wallet::new("fee_payment", settings);
    let mut vault = VaultCovenant::from_file(&settings.vault_file)?;
    let timelock_in_blocks = vault.timelock_in_blocks;

    let user_destination = Address::from_str(destination)?.require_network(settings.network)?;

    let fee_paying_address = fee_wallet.get_new_address()?;
    let fee_paying_utxo = miner_wallet.send(&fee_paying_address, Amount::from_sat(10_000))?;

    info!("Mining {} blocks for the CSV timelock", timelock_in_blocks);
    miner_wallet.mine_blocks(Some(timelock_in_blocks as u64))?;

    let timeout_tx = vault.create_timeout_tx(
        &fee_paying_utxo,
        TxOut {
            script_pubkey: fee_paying_address.script_pubkey(),
            value: Amount::from_sat(10_000), // full UTXO → all goes to miners as fee
        },
        &user_destination,
    )?;
    // Sign the fee input (input[1]) with the fee wallet; vault input[0] is left intact.
    let timeout_tx = fee_wallet.sign_tx(&timeout_tx)?;

    let mut serialized_tx = Vec::new();
    timeout_tx.consensus_encode(&mut serialized_tx).unwrap();
    debug!("serialized timeout tx: {:?}", serialized_tx.raw_hex());

    let txid = fee_wallet.broadcast_tx(&serialized_tx, None)?;
    info!("timeout txid: {}", txid);
    miner_wallet.mine_blocks(Some(1))?;

    vault.set_current_outpoint(OutPoint { txid, vout: 0 });
    vault.set_state(VaultState::Repaid);
    vault.to_file(&settings.vault_file)?;
    Ok(())
}

fn deposit(settings: &Settings) -> Result<()> {
    if VaultCovenant::from_file(&settings.vault_file).is_ok() {
        info!("Vault already exists. Delete the vault file to start over.");
        return Ok(());
    }

    info!("Setting up miner wallet");
    let miner_wallet = Wallet::new("miner", settings);
    while miner_wallet.get_balance()? < Amount::from_btc(1.0f64)? {
        debug!("Mining blocks to fund miner wallet");
        miner_wallet.mine_blocks(Some(1))?;
    }

    let fee_wallet = Wallet::new("fee_payment", settings);
    while fee_wallet.get_balance()? < Amount::from_sat(50_000) {
        let fee_address = fee_wallet.get_new_address()?;
        miner_wallet.send(&fee_address, Amount::from_sat(10_000))?;
        miner_wallet.mine_blocks(Some(1))?;
    }

    let timelock_in_blocks = 20;
    let mut vault = VaultCovenant::new(timelock_in_blocks, settings)?;

    if settings
        .oracle_private_key_hex
        .as_ref()
        .map(|v| !v.trim().is_empty())
        .unwrap_or(false)
    {
        info!("Using fixed oracle keypair from settings.toml");
    } else {
        info!("Using randomly generated oracle keypair for this vault");
    }

    // Set the liquidation pool address — in production this is the protocol's multisig.
    // For the demo we use a fresh miner address (funds stay recoverable).
    let liq_pool_address = miner_wallet.get_new_address()?;
    vault.set_liquidation_pool_address(Some(liq_pool_address.clone()));
    info!("Liquidation pool address: {}", liq_pool_address);
    info!(
        "Oracle public key (give to Chainlink CRE): {}",
        vault.oracle_x_only_public_key()
    );

    info!("Depositing BTC into vault");
    let vault_address = vault.address()?;
    info!("Vault Taproot address: {}", vault_address);
    let deposit_tx = miner_wallet.send(&vault_address, Amount::from_sat(100_000_000))?;
    vault.set_amount(Amount::from_sat(100_000_000));
    vault.set_current_outpoint(deposit_tx);
    vault.set_state(VaultState::Active);
    info!("Deposit outpoint: {}:{}", deposit_tx.txid, deposit_tx.vout);
    miner_wallet.mine_blocks(Some(1))?;

    vault.to_file(&settings.vault_file)?;
    info!("Vault saved. Register on Starknet with the deposit txid to start borrowing.");
    Ok(())
}
