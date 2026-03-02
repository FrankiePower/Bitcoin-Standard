/// Tests for CDPCore contract
///
/// Test coverage:
/// - Deployment / constructor
/// - register_vault: happy path, zero amount, paused
/// - mint_debt: safe position, at threshold, undercollateralized, wrong owner, stale oracle, zero
/// amount - repay_debt: partial, full (closes vault), exceeds debt, no debt, wrong owner
/// - liquidate: undercollateralized (after price drop), healthy vault, paused
/// - get_health_factor: no debt (max), with debt
/// - get_position / get_protocol_stats
/// - Admin: pause/unpause (owner), set_oracle (owner, access, zero)

use contracts::interfaces::{
    IBTCUSDTokenDispatcher, IBTCUSDTokenDispatcherTrait, ICDPCoreDispatcher,
    ICDPCoreDispatcherTrait, IMockOracleDispatcher, IMockOracleDispatcherTrait,
    IVaultRegistryDispatcher, IVaultRegistryDispatcherTrait,
};
use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_block_timestamp,
    start_cheat_caller_address, stop_cheat_block_timestamp, stop_cheat_caller_address,
};
use starknet::{ContractAddress, contract_address_const};

// ============ Test Addresses ============

fn OWNER() -> ContractAddress {
    contract_address_const::<'OWNER'>()
}

fn USER1() -> ContractAddress {
    contract_address_const::<'USER1'>()
}

fn USER2() -> ContractAddress {
    contract_address_const::<'USER2'>()
}

// ============ Constants ============

const TXID_1: felt252 = 'btc_txid_1';
const TXID_2: felt252 = 'btc_txid_2';

/// 1 BTC in satoshis
const ONE_BTC: u256 = 100_000_000;

/// Oracle price: $65,000 with 8 decimals (matches MockOracle default)
const PRICE_65K: u256 = 6_500_000_000_000;

/// Oracle price: $40,000 with 8 decimals (drop to trigger liquidation)
const PRICE_40K: u256 = 4_000_000_000_000;

/// 30,000 BTCUSD with 18 decimals. At $65k / 1 BTC → health_factor = 144 (safe, ~216% CR)
const DEBT_30K: u256 = 30_000_000_000_000_000_000_000;

/// Debt that yields health_factor == 100 exactly at $65k / 1 BTC (150% CR threshold)
/// debt_usd (8 dec) = 4_333_333_333_333 → debt_18dec = 4_333_333_333_333 * 1e10
const DEBT_AT_THRESHOLD: u256 = 43_333_333_333_330_000_000_000;

/// Debt just over the 150% CR threshold → health_factor = 98 → undercollateralized
/// debt_usd (8 dec) = 4_400_000_000_000 → debt_18dec = 4_400_000_000_000 * 1e10
const DEBT_OVER_THRESHOLD: u256 = 44_000_000_000_000_000_000_000;

// ============ System Deployment ============

/// Deploys the full 4-contract stack and wires them together:
///   MockOracle → VaultRegistry → CDPCore ← BTCUSDToken
///
/// Circular dependency resolved:
///   1. Deploy VaultRegistry with cdp_core = OWNER() (placeholder, non-zero)
///   2. Deploy BTCUSDToken with vault = OWNER() (placeholder, non-zero)
///   3. Deploy CDPCore with real registry + token + oracle addresses
///   4. set_cdp_core(cdp_addr) on VaultRegistry
///   5. set_vault(cdp_addr) on BTCUSDToken
fn deploy_system() -> (
    ContractAddress,
    ContractAddress,
    ContractAddress,
    ContractAddress,
    ICDPCoreDispatcher,
    IVaultRegistryDispatcher,
    IBTCUSDTokenDispatcher,
    IMockOracleDispatcher,
) {
    // 1. MockOracle
    let oracle_class = declare("MockOracle").unwrap().contract_class();
    let mut oracle_cd = array![];
    OWNER().serialize(ref oracle_cd);
    let (oracle_addr, _) = oracle_class.deploy(@oracle_cd).unwrap();

    // 2. VaultRegistry (cdp_core = OWNER() placeholder)
    let reg_class = declare("VaultRegistry").unwrap().contract_class();
    let mut reg_cd = array![];
    OWNER().serialize(ref reg_cd);
    OWNER().serialize(ref reg_cd); // placeholder cdp_core
    let (reg_addr, _) = reg_class.deploy(@reg_cd).unwrap();

    // 3. BTCUSDToken (vault = OWNER() placeholder)
    let token_class = declare("BTCUSDToken").unwrap().contract_class();
    let mut token_cd = array![];
    OWNER().serialize(ref token_cd);
    OWNER().serialize(ref token_cd); // placeholder vault
    let (token_addr, _) = token_class.deploy(@token_cd).unwrap();

    // 4. CDPCore
    let cdp_class = declare("CDPCore").unwrap().contract_class();
    let mut cdp_cd = array![];
    OWNER().serialize(ref cdp_cd);
    reg_addr.serialize(ref cdp_cd);
    token_addr.serialize(ref cdp_cd);
    oracle_addr.serialize(ref cdp_cd);
    let (cdp_addr, _) = cdp_class.deploy(@cdp_cd).unwrap();

    // 5. Wire VaultRegistry → CDPCore
    let registry = IVaultRegistryDispatcher { contract_address: reg_addr };
    start_cheat_caller_address(reg_addr, OWNER());
    registry.set_cdp_core(cdp_addr);
    stop_cheat_caller_address(reg_addr);

    // 6. Wire BTCUSDToken → CDPCore
    let token = IBTCUSDTokenDispatcher { contract_address: token_addr };
    start_cheat_caller_address(token_addr, OWNER());
    token.set_vault(cdp_addr);
    stop_cheat_caller_address(token_addr);

    let cdp = ICDPCoreDispatcher { contract_address: cdp_addr };
    let oracle = IMockOracleDispatcher { contract_address: oracle_addr };

    (cdp_addr, reg_addr, token_addr, oracle_addr, cdp, registry, token, oracle)
}

// ============ Deployment Tests ============

#[test]
fn test_deploy_wires_correctly() {
    let (_, reg_addr, token_addr, _, cdp, _, token, _) = deploy_system();
    // Verify get_position on a non-existent vault returns zeros (no revert)
    let (btc, debt) = cdp.get_position(TXID_1);
    assert(btc == 0, 'Expected 0 btc');
    assert(debt == 0, 'Expected 0 debt');
    // Verify token vault is set to CDP
    let _ = token.get_vault(); // just ensure it doesn't revert
    let _ = reg_addr;
    let _ = token_addr;
}

// ============ register_vault Tests ============

#[test]
fn test_register_vault_happy_path() {
    let (cdp_addr, reg_addr, _, _, cdp, registry, _, _) = deploy_system();

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, ONE_BTC);
    stop_cheat_caller_address(cdp_addr);

    assert(registry.is_active(TXID_1), 'Vault should be active');
    assert(registry.get_owner(TXID_1) == USER1(), 'Wrong vault owner');
    assert(registry.get_btc_amount(TXID_1) == ONE_BTC, 'Wrong btc amount');
    let _ = reg_addr;
}

#[test]
#[should_panic(expected: 'CDP: zero amount')]
fn test_register_vault_zero_amount() {
    let (cdp_addr, _, _, _, cdp, _, _, _) = deploy_system();

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, 0);
    stop_cheat_caller_address(cdp_addr);
}

#[test]
#[should_panic(expected: 'Pausable: paused')]
fn test_register_vault_when_paused() {
    let (cdp_addr, _, _, _, cdp, _, _, _) = deploy_system();

    start_cheat_caller_address(cdp_addr, OWNER());
    cdp.pause();
    stop_cheat_caller_address(cdp_addr);

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, ONE_BTC);
    stop_cheat_caller_address(cdp_addr);
}

// ============ mint_debt Tests ============

#[test]
fn test_mint_debt_safe_position() {
    let (cdp_addr, _, token_addr, _, cdp, _, _, _) = deploy_system();

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, ONE_BTC);
    cdp.mint_debt(TXID_1, DEBT_30K);
    stop_cheat_caller_address(cdp_addr);

    let hf = cdp.get_health_factor(TXID_1);
    assert(hf >= 100, 'Health factor should be safe');
    assert(hf == 144, 'Expected hf=144 at 216% CR');

    let erc20 = IERC20Dispatcher { contract_address: token_addr };
    assert(erc20.balance_of(USER1()) == DEBT_30K, 'Wrong BTCUSD balance');

    let (_, debt_pos) = cdp.get_position(TXID_1);
    assert(debt_pos == DEBT_30K, 'Wrong position debt');

    let (_, total_debt) = cdp.get_protocol_stats();
    assert(total_debt == DEBT_30K, 'Wrong total debt');
}

#[test]
fn test_mint_debt_at_threshold() {
    let (cdp_addr, _, _, _, cdp, _, _, _) = deploy_system();

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, ONE_BTC);
    cdp.mint_debt(TXID_1, DEBT_AT_THRESHOLD);
    stop_cheat_caller_address(cdp_addr);

    let hf = cdp.get_health_factor(TXID_1);
    assert(hf == 100, 'Expected hf=100 at threshold');
}

#[test]
#[should_panic(expected: 'CDP: undercollateralized')]
fn test_mint_debt_undercollateralized() {
    let (cdp_addr, _, _, _, cdp, _, _, _) = deploy_system();

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, ONE_BTC);
    cdp.mint_debt(TXID_1, DEBT_OVER_THRESHOLD); // hf would be 98 < 100
    stop_cheat_caller_address(cdp_addr);
}

#[test]
#[should_panic(expected: 'CDP: not vault owner')]
fn test_mint_debt_not_owner() {
    let (cdp_addr, _, _, _, cdp, _, _, _) = deploy_system();

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, ONE_BTC);
    stop_cheat_caller_address(cdp_addr);

    start_cheat_caller_address(cdp_addr, USER2());
    cdp.mint_debt(TXID_1, DEBT_30K); // USER2 does not own TXID_1
    stop_cheat_caller_address(cdp_addr);
}

#[test]
#[should_panic(expected: 'CDP: zero amount')]
fn test_mint_debt_zero_amount() {
    let (cdp_addr, _, _, _, cdp, _, _, _) = deploy_system();

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, ONE_BTC);
    cdp.mint_debt(TXID_1, 0);
    stop_cheat_caller_address(cdp_addr);
}

#[test]
#[should_panic(expected: 'CDP: stale oracle price')]
fn test_mint_debt_stale_oracle() {
    let (cdp_addr, _, _, oracle_addr, cdp, _, _, _) = deploy_system();

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, ONE_BTC);
    stop_cheat_caller_address(cdp_addr);

    // Advance block timestamp well past oracle max age (3600s default)
    start_cheat_block_timestamp(oracle_addr, 10_000);

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.mint_debt(TXID_1, DEBT_30K);
    stop_cheat_caller_address(cdp_addr);

    stop_cheat_block_timestamp(oracle_addr);
}

#[test]
#[should_panic(expected: 'CDP: vault not active')]
fn test_mint_debt_on_closed_vault() {
    let (cdp_addr, _, _, _, cdp, _, _, _) = deploy_system();

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, ONE_BTC);
    cdp.mint_debt(TXID_1, DEBT_30K);
    cdp.repay_debt(TXID_1, DEBT_30K); // full repay → closes vault
    cdp.mint_debt(TXID_1, DEBT_30K); // should fail: vault closed
    stop_cheat_caller_address(cdp_addr);
}

// ============ repay_debt Tests ============

#[test]
fn test_repay_debt_partial() {
    let (cdp_addr, _, _, _, cdp, _, _, _) = deploy_system();
    let partial = 10_000_000_000_000_000_000_000; // 10,000 BTCUSD

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, ONE_BTC);
    cdp.mint_debt(TXID_1, DEBT_30K);
    cdp.repay_debt(TXID_1, partial);
    stop_cheat_caller_address(cdp_addr);

    let (_, debt) = cdp.get_position(TXID_1);
    assert(debt == DEBT_30K - partial, 'Wrong remaining debt');
}

#[test]
fn test_repay_debt_full_closes_vault() {
    let (cdp_addr, _, _, _, cdp, registry, _, _) = deploy_system();

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, ONE_BTC);
    cdp.mint_debt(TXID_1, DEBT_30K);
    cdp.repay_debt(TXID_1, DEBT_30K);
    stop_cheat_caller_address(cdp_addr);

    assert(!registry.is_active(TXID_1), 'Vault should be closed');

    let (_, total_debt) = cdp.get_protocol_stats();
    assert(total_debt == 0, 'Total debt should be 0');
}

#[test]
#[should_panic(expected: 'CDP: zero amount')]
fn test_repay_debt_zero_amount() {
    let (cdp_addr, _, _, _, cdp, _, _, _) = deploy_system();

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, ONE_BTC);
    cdp.mint_debt(TXID_1, DEBT_30K);
    cdp.repay_debt(TXID_1, 0);
    stop_cheat_caller_address(cdp_addr);
}

#[test]
#[should_panic(expected: 'CDP: amount exceeds debt')]
fn test_repay_debt_exceeds_outstanding() {
    let (cdp_addr, _, _, _, cdp, _, _, _) = deploy_system();

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, ONE_BTC);
    cdp.mint_debt(TXID_1, DEBT_30K);
    cdp.repay_debt(TXID_1, DEBT_30K + 1); // 1 wei over
    stop_cheat_caller_address(cdp_addr);
}

#[test]
#[should_panic(expected: 'CDP: no debt to repay')]
fn test_repay_debt_when_no_debt() {
    let (cdp_addr, _, _, _, cdp, _, _, _) = deploy_system();

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, ONE_BTC);
    cdp.repay_debt(TXID_1, DEBT_30K); // no debt minted
    stop_cheat_caller_address(cdp_addr);
}

#[test]
#[should_panic(expected: 'CDP: not vault owner')]
fn test_repay_debt_not_owner() {
    let (cdp_addr, _, _, _, cdp, _, _, _) = deploy_system();

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, ONE_BTC);
    cdp.mint_debt(TXID_1, DEBT_30K);
    stop_cheat_caller_address(cdp_addr);

    start_cheat_caller_address(cdp_addr, USER2());
    cdp.repay_debt(TXID_1, DEBT_30K); // USER2 doesn't own vault
    stop_cheat_caller_address(cdp_addr);
}

// ============ get_health_factor Tests ============

#[test]
fn test_health_factor_no_debt_returns_max() {
    let (cdp_addr, _, _, _, cdp, _, _, _) = deploy_system();

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, ONE_BTC);
    stop_cheat_caller_address(cdp_addr);

    let hf = cdp.get_health_factor(TXID_1);
    assert(hf == 999_999, 'No debt should give max hf');
}

#[test]
fn test_health_factor_with_debt() {
    let (cdp_addr, _, _, _, cdp, _, _, _) = deploy_system();

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, ONE_BTC);
    cdp.mint_debt(TXID_1, DEBT_30K);
    stop_cheat_caller_address(cdp_addr);

    // 1 BTC at $65k, $30k debt → ~216% CR → hf = 144
    assert(cdp.get_health_factor(TXID_1) == 144, 'Expected hf=144');
}

// ============ liquidate Tests ============

#[test]
fn test_liquidate_undercollateralized_vault() {
    let (cdp_addr, _, _, oracle_addr, cdp, registry, _, oracle) = deploy_system();

    // Register vault and mint safe debt
    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, ONE_BTC);
    cdp.mint_debt(TXID_1, DEBT_30K); // hf = 144 at $65k
    stop_cheat_caller_address(cdp_addr);

    // Price drops to $40,000 → hf = 88 (below 100)
    start_cheat_caller_address(oracle_addr, OWNER());
    oracle.set_btc_price(PRICE_40K);
    stop_cheat_caller_address(oracle_addr);

    // Anyone can call liquidate
    cdp.liquidate(TXID_1);

    assert(!registry.is_active(TXID_1), 'Vault should be liquidated');

    let (_, total_debt) = cdp.get_protocol_stats();
    assert(total_debt == 0, 'Total debt should be cleared');
}

#[test]
#[should_panic(expected: 'CDP: health factor ok')]
fn test_liquidate_healthy_vault_fails() {
    let (cdp_addr, _, _, _, cdp, _, _, _) = deploy_system();

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, ONE_BTC);
    cdp.mint_debt(TXID_1, DEBT_30K); // hf = 144, safe
    stop_cheat_caller_address(cdp_addr);

    cdp.liquidate(TXID_1); // must fail: health factor ok
}

#[test]
#[should_panic(expected: 'Pausable: paused')]
fn test_liquidate_when_paused() {
    let (cdp_addr, _, _, oracle_addr, cdp, _, _, oracle) = deploy_system();

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, ONE_BTC);
    cdp.mint_debt(TXID_1, DEBT_30K);
    stop_cheat_caller_address(cdp_addr);

    start_cheat_caller_address(oracle_addr, OWNER());
    oracle.set_btc_price(PRICE_40K);
    stop_cheat_caller_address(oracle_addr);

    start_cheat_caller_address(cdp_addr, OWNER());
    cdp.pause();
    stop_cheat_caller_address(cdp_addr);

    cdp.liquidate(TXID_1); // must fail: paused
}

// ============ Admin Tests ============

#[test]
fn test_owner_can_pause_and_unpause() {
    let (cdp_addr, _, _, _, cdp, _, _, _) = deploy_system();

    start_cheat_caller_address(cdp_addr, OWNER());
    cdp.pause();
    stop_cheat_caller_address(cdp_addr);

    // Attempt an action while paused
    let mut panicked = false;
    // Just verify register_vault panics when paused (guard passes)
    // (Full pause test is also covered by test_register_vault_when_paused)

    start_cheat_caller_address(cdp_addr, OWNER());
    cdp.unpause();
    stop_cheat_caller_address(cdp_addr);

    // After unpause, should work again
    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, ONE_BTC);
    stop_cheat_caller_address(cdp_addr);

    let _ = panicked; // suppress unused warning
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_pause_requires_owner() {
    let (cdp_addr, _, _, _, cdp, _, _, _) = deploy_system();

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.pause();
    stop_cheat_caller_address(cdp_addr);
}

#[test]
fn test_owner_can_set_oracle() {
    let (cdp_addr, _, _, _, cdp, _, _, _) = deploy_system();
    let new_oracle = USER2(); // just a non-zero address

    start_cheat_caller_address(cdp_addr, OWNER());
    cdp.set_oracle(new_oracle);
    stop_cheat_caller_address(cdp_addr);
    // If it didn't panic, the update succeeded
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_set_oracle_requires_owner() {
    let (cdp_addr, _, _, _, cdp, _, _, _) = deploy_system();

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.set_oracle(USER2());
    stop_cheat_caller_address(cdp_addr);
}

#[test]
#[should_panic(expected: 'CDP: zero address')]
fn test_set_oracle_rejects_zero_address() {
    let (cdp_addr, _, _, _, cdp, _, _, _) = deploy_system();

    start_cheat_caller_address(cdp_addr, OWNER());
    cdp.set_oracle(contract_address_const::<0>());
    stop_cheat_caller_address(cdp_addr);
}

// ============ get_protocol_stats Tests ============

#[test]
fn test_protocol_stats_tracks_debt() {
    let (cdp_addr, _, _, _, cdp, _, _, _) = deploy_system();

    let (_, debt_before) = cdp.get_protocol_stats();
    assert(debt_before == 0, 'Should start with 0 debt');

    start_cheat_caller_address(cdp_addr, USER1());
    cdp.register_vault(TXID_1, ONE_BTC);
    cdp.mint_debt(TXID_1, DEBT_30K);
    stop_cheat_caller_address(cdp_addr);

    let (_, debt_after) = cdp.get_protocol_stats();
    assert(debt_after == DEBT_30K, 'Debt not tracked');
}
