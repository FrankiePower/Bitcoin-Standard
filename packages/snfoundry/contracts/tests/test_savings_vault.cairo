/// Tests for BTSSavingsVault contract
///
/// Test coverage:
/// - Deployment and initialization
/// - Deposits and share minting
/// - Withdrawals and redemptions
/// - Rate accumulation (chi/vsr)
/// - Deposit cap enforcement
/// - Pause/unpause functionality
/// - Admin functions (set_vsr, set_deposit_cap)

use contracts::mock_wbtc::{IMockWBTCDispatcher, IMockWBTCDispatcherTrait};
use contracts::savings::interfaces::{
    IBTSSavingsVaultDispatcher, IBTSSavingsVaultDispatcherTrait, VaultStats,
};
use core::num::traits::Zero;
use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address,
    stop_cheat_caller_address, start_cheat_block_timestamp_global, stop_cheat_block_timestamp_global,
};
use starknet::{ContractAddress, contract_address_const};

// ============ Constants ============

fn OWNER() -> ContractAddress {
    contract_address_const::<'OWNER'>()
}

fn USER1() -> ContractAddress {
    contract_address_const::<'USER1'>()
}

fn USER2() -> ContractAddress {
    contract_address_const::<'USER2'>()
}

fn ZERO_ADDRESS() -> ContractAddress {
    contract_address_const::<0>()
}

/// RAY = 1e27, the base unit for chi and vsr
const RAY: u256 = 1000000000000000000000000000;

/// ~4% APY VSR (per-second rate in ray)
/// Formula: (1 + 0.04)^(1/31536000) * RAY ≈ 1.00000000124368... * RAY
const VSR_4_PERCENT: u256 = 1000000001243680656318820312;

/// 1 token with 18 decimals
const ONE_TOKEN: u256 = 1000000000000000000;

/// Initial timestamp for tests
const INITIAL_TIMESTAMP: u64 = 1000000;

/// One year in seconds
const ONE_YEAR: u64 = 31536000;

// ============ Test Helpers ============

/// Deploy MockWBTC as the underlying asset for testing
fn deploy_mock_asset() -> (ContractAddress, IERC20Dispatcher, IMockWBTCDispatcher) {
    let contract = declare("MockWBTC").unwrap().contract_class();
    let mut calldata = array![];
    OWNER().serialize(ref calldata);
    let (address, _) = contract.deploy(@calldata).unwrap();
    (address, IERC20Dispatcher { contract_address: address }, IMockWBTCDispatcher { contract_address: address })
}

/// Deploy BTSSavingsVault with specified parameters
fn deploy_vault(
    owner: ContractAddress,
    asset: ContractAddress,
    name: ByteArray,
    symbol: ByteArray,
    initial_vsr: u256,
) -> (ContractAddress, IBTSSavingsVaultDispatcher) {
    let contract = declare("BTSSavingsVault").unwrap().contract_class();
    let mut calldata = array![];
    owner.serialize(ref calldata);
    asset.serialize(ref calldata);
    name.serialize(ref calldata);
    symbol.serialize(ref calldata);
    initial_vsr.serialize(ref calldata);
    let (address, _) = contract.deploy(@calldata).unwrap();
    (address, IBTSSavingsVaultDispatcher { contract_address: address })
}

/// Deploy full test system: asset + vault
fn deploy_system() -> (
    ContractAddress, // asset address
    IERC20Dispatcher, // asset dispatcher
    IMockWBTCDispatcher, // mock wbtc dispatcher (for minting)
    ContractAddress, // vault address
    IBTSSavingsVaultDispatcher, // vault dispatcher
    IERC20Dispatcher, // vault share token dispatcher
) {
    // Set initial timestamp
    start_cheat_block_timestamp_global(INITIAL_TIMESTAMP);

    // Deploy asset
    let (asset_addr, asset, mock_asset) = deploy_mock_asset();

    // Deploy vault
    let (vault_addr, vault) = deploy_vault(
        OWNER(), asset_addr, "Savings WBTC", "sWBTC", VSR_4_PERCENT,
    );
    let vault_shares = IERC20Dispatcher { contract_address: vault_addr };

    // Mint tokens to users
    start_cheat_caller_address(asset_addr, OWNER());
    mock_asset.mint(USER1(), 100 * ONE_TOKEN);
    mock_asset.mint(USER2(), 100 * ONE_TOKEN);
    stop_cheat_caller_address(asset_addr);

    (asset_addr, asset, mock_asset, vault_addr, vault, vault_shares)
}

/// Helper to approve and deposit
fn approve_and_deposit(
    asset: IERC20Dispatcher,
    vault_addr: ContractAddress,
    vault: IBTSSavingsVaultDispatcher,
    user: ContractAddress,
    amount: u256,
) -> u256 {
    start_cheat_caller_address(asset.contract_address, user);
    asset.approve(vault_addr, amount);
    stop_cheat_caller_address(asset.contract_address);

    start_cheat_caller_address(vault_addr, user);
    let shares = vault.deposit(amount, user);
    stop_cheat_caller_address(vault_addr);
    shares
}

// ============ Deployment Tests ============

#[test]
fn test_vault_deployment() {
    let (asset_addr, _, _, vault_addr, vault, _) = deploy_system();

    // Check initialization
    assert(vault.asset() == asset_addr, 'Wrong asset address');
    assert(vault.total_assets() == 0, 'Should start with 0 assets');
    assert(vault.get_vsr() == VSR_4_PERCENT, 'Wrong initial VSR');
    assert(vault.now_chi() == RAY, 'Chi should start at RAY');
}

#[test]
#[should_panic(expected: 'SV: zero address')]
fn test_cannot_deploy_with_zero_owner() {
    let (asset_addr, _, _, _, _, _) = deploy_system();
    deploy_vault(ZERO_ADDRESS(), asset_addr, "Test", "TST", RAY);
}

#[test]
#[should_panic(expected: 'SV: zero address')]
fn test_cannot_deploy_with_zero_asset() {
    deploy_vault(OWNER(), ZERO_ADDRESS(), "Test", "TST", RAY);
}

#[test]
#[should_panic(expected: 'SV: vsr below RAY')]
fn test_cannot_deploy_with_vsr_below_ray() {
    let (asset_addr, _, _, _, _, _) = deploy_system();
    deploy_vault(OWNER(), asset_addr, "Test", "TST", RAY - 1);
}

// ============ Deposit Tests ============

#[test]
fn test_deposit() {
    let (_, asset, _, vault_addr, vault, vault_shares) = deploy_system();

    let deposit_amount = 10 * ONE_TOKEN;
    let initial_balance = asset.balance_of(USER1());

    // Deposit
    let shares = approve_and_deposit(asset, vault_addr, vault, USER1(), deposit_amount);

    // At t=0, chi=RAY, so shares should equal assets
    assert(shares == deposit_amount, 'Wrong shares minted');
    assert(vault_shares.balance_of(USER1()) == shares, 'Wrong share balance');
    assert(asset.balance_of(USER1()) == initial_balance - deposit_amount, 'Wrong asset balance');
    assert(vault.total_assets() == deposit_amount, 'Wrong total assets');
}

#[test]
fn test_deposit_multiple_users() {
    let (_, asset, _, vault_addr, vault, vault_shares) = deploy_system();

    // User1 deposits
    let shares1 = approve_and_deposit(asset, vault_addr, vault, USER1(), 10 * ONE_TOKEN);

    // User2 deposits
    let shares2 = approve_and_deposit(asset, vault_addr, vault, USER2(), 20 * ONE_TOKEN);

    assert(vault_shares.balance_of(USER1()) == shares1, 'Wrong USER1 shares');
    assert(vault_shares.balance_of(USER2()) == shares2, 'Wrong USER2 shares');
    assert(vault.total_assets() == 30 * ONE_TOKEN, 'Wrong total assets');
    assert(vault.get_depositor_count() == 2, 'Wrong depositor count');
}

#[test]
#[should_panic(expected: 'SV: zero amount')]
fn test_cannot_deposit_zero() {
    let (_, asset, _, vault_addr, vault, _) = deploy_system();

    start_cheat_caller_address(asset.contract_address, USER1());
    asset.approve(vault_addr, ONE_TOKEN);
    stop_cheat_caller_address(asset.contract_address);

    start_cheat_caller_address(vault_addr, USER1());
    vault.deposit(0, USER1());
    stop_cheat_caller_address(vault_addr);
}

#[test]
#[should_panic(expected: 'SV: zero address')]
fn test_cannot_deposit_to_zero_receiver() {
    let (_, asset, _, vault_addr, vault, _) = deploy_system();

    start_cheat_caller_address(asset.contract_address, USER1());
    asset.approve(vault_addr, ONE_TOKEN);
    stop_cheat_caller_address(asset.contract_address);

    start_cheat_caller_address(vault_addr, USER1());
    vault.deposit(ONE_TOKEN, ZERO_ADDRESS());
    stop_cheat_caller_address(vault_addr);
}

// ============ Withdrawal Tests ============

#[test]
fn test_withdraw() {
    let (_, asset, _, vault_addr, vault, _) = deploy_system();

    // Deposit
    let deposit_amount = 10 * ONE_TOKEN;
    approve_and_deposit(asset, vault_addr, vault, USER1(), deposit_amount);

    // Withdraw half
    let withdraw_amount = 5 * ONE_TOKEN;
    start_cheat_caller_address(vault_addr, USER1());
    let shares_burned = vault.withdraw(withdraw_amount, USER1(), USER1());
    stop_cheat_caller_address(vault_addr);

    // At t=0, shares should equal assets
    assert(shares_burned == withdraw_amount, 'Wrong shares burned');
    assert(vault.assets_of(USER1()) == deposit_amount - withdraw_amount, 'Wrong remaining assets');
}

#[test]
fn test_redeem() {
    let (_, asset, _, vault_addr, vault, vault_shares) = deploy_system();

    // Deposit
    let deposit_amount = 10 * ONE_TOKEN;
    let shares = approve_and_deposit(asset, vault_addr, vault, USER1(), deposit_amount);

    // Redeem all shares
    start_cheat_caller_address(vault_addr, USER1());
    let assets = vault.redeem(shares, USER1(), USER1());
    stop_cheat_caller_address(vault_addr);

    assert(assets == deposit_amount, 'Wrong assets received');
    assert(vault_shares.balance_of(USER1()) == 0, 'Should have no shares');
}

#[test]
#[should_panic(expected: 'SV: zero amount')]
fn test_cannot_withdraw_zero() {
    let (_, asset, _, vault_addr, vault, _) = deploy_system();

    approve_and_deposit(asset, vault_addr, vault, USER1(), 10 * ONE_TOKEN);

    start_cheat_caller_address(vault_addr, USER1());
    vault.withdraw(0, USER1(), USER1());
    stop_cheat_caller_address(vault_addr);
}

// ============ Rate Accumulation Tests ============

#[test]
fn test_chi_accumulates_over_time() {
    let (_, asset, _, vault_addr, vault, _) = deploy_system();

    // Deposit
    approve_and_deposit(asset, vault_addr, vault, USER1(), 10 * ONE_TOKEN);

    // Get initial chi
    let initial_chi = vault.now_chi();
    assert(initial_chi == RAY, 'Initial chi should be RAY');

    // Advance time by 1 year
    start_cheat_block_timestamp_global(INITIAL_TIMESTAMP + ONE_YEAR);

    // Chi should have increased by ~4%
    let new_chi = vault.now_chi();
    assert(new_chi > initial_chi, 'Chi should increase');

    // Check that it's approximately 1.04 * RAY (allowing 0.1% tolerance)
    let expected_chi = RAY * 104 / 100; // 1.04 * RAY
    let tolerance = RAY / 1000; // 0.1%
    assert(new_chi >= expected_chi - tolerance, 'Chi too low');
    assert(new_chi <= expected_chi + tolerance, 'Chi too high');
}

#[test]
fn test_shares_appreciate_over_time() {
    let (_, asset, _, vault_addr, vault, _) = deploy_system();

    // Deposit
    let deposit_amount = 10 * ONE_TOKEN;
    let shares = approve_and_deposit(asset, vault_addr, vault, USER1(), deposit_amount);

    // Initially, assets_of should equal deposit
    assert(vault.assets_of(USER1()) == deposit_amount, 'Wrong initial assets');

    // Advance time by 1 year
    start_cheat_block_timestamp_global(INITIAL_TIMESTAMP + ONE_YEAR);

    // Assets should have appreciated by ~4%
    let assets_after = vault.assets_of(USER1());
    assert(assets_after > deposit_amount, 'Assets should appreciate');

    // Convert shares should also show appreciation
    let converted = vault.convert_to_assets(shares);
    assert(converted == assets_after, 'Convert should match assets_of');
}

#[test]
fn test_new_depositor_gets_fewer_shares_after_appreciation() {
    let (_, asset, _, vault_addr, vault, vault_shares) = deploy_system();

    // User1 deposits at t=0
    let deposit_amount = 10 * ONE_TOKEN;
    let shares1 = approve_and_deposit(asset, vault_addr, vault, USER1(), deposit_amount);

    // Advance time by 1 year
    start_cheat_block_timestamp_global(INITIAL_TIMESTAMP + ONE_YEAR);

    // User2 deposits same amount
    let shares2 = approve_and_deposit(asset, vault_addr, vault, USER2(), deposit_amount);

    // User2 should get fewer shares (chi has increased)
    assert(shares2 < shares1, 'Later gets fewer shares');

    // But their assets_of should be equal (just deposited)
    // User1's assets should be higher due to appreciation
    assert(vault.assets_of(USER1()) > vault.assets_of(USER2()), 'Early depositor has more');
}

// ============ Deposit Cap Tests ============

#[test]
fn test_deposit_cap_enforcement() {
    let (_, asset, _, vault_addr, vault, _) = deploy_system();

    // Set deposit cap
    let cap = 15 * ONE_TOKEN;
    start_cheat_caller_address(vault_addr, OWNER());
    vault.set_deposit_cap(cap);
    stop_cheat_caller_address(vault_addr);

    // Deposit up to cap
    approve_and_deposit(asset, vault_addr, vault, USER1(), 10 * ONE_TOKEN);

    // Should be able to deposit more (up to cap)
    approve_and_deposit(asset, vault_addr, vault, USER2(), 5 * ONE_TOKEN);

    // Total should be at cap
    assert(vault.total_assets() == cap, 'Should be at cap');
}

#[test]
#[should_panic(expected: 'SV: deposit cap exceeded')]
fn test_cannot_exceed_deposit_cap() {
    let (_, asset, _, vault_addr, vault, _) = deploy_system();

    // Set deposit cap
    let cap = 10 * ONE_TOKEN;
    start_cheat_caller_address(vault_addr, OWNER());
    vault.set_deposit_cap(cap);
    stop_cheat_caller_address(vault_addr);

    // Try to deposit more than cap
    approve_and_deposit(asset, vault_addr, vault, USER1(), cap + ONE_TOKEN);
}

#[test]
fn test_unlimited_deposit_when_cap_is_zero() {
    let (_, asset, _, vault_addr, vault, _) = deploy_system();

    // Cap is 0 by default (unlimited)
    approve_and_deposit(asset, vault_addr, vault, USER1(), 50 * ONE_TOKEN);
    approve_and_deposit(asset, vault_addr, vault, USER2(), 50 * ONE_TOKEN);

    assert(vault.total_assets() == 100 * ONE_TOKEN, 'Should allow unlimited');
}

// ============ Admin Tests ============

#[test]
fn test_owner_can_set_vsr() {
    let (_, _, _, vault_addr, vault, _) = deploy_system();

    let new_vsr = RAY + 100; // Just above RAY

    start_cheat_caller_address(vault_addr, OWNER());
    vault.set_vsr(new_vsr);
    stop_cheat_caller_address(vault_addr);

    assert(vault.get_vsr() == new_vsr, 'VSR not updated');
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_non_owner_cannot_set_vsr() {
    let (_, _, _, vault_addr, vault, _) = deploy_system();

    start_cheat_caller_address(vault_addr, USER1());
    vault.set_vsr(RAY + 100);
    stop_cheat_caller_address(vault_addr);
}

#[test]
#[should_panic(expected: 'SV: vsr below RAY')]
fn test_cannot_set_vsr_below_ray() {
    let (_, _, _, vault_addr, vault, _) = deploy_system();

    start_cheat_caller_address(vault_addr, OWNER());
    vault.set_vsr(RAY - 1);
    stop_cheat_caller_address(vault_addr);
}

#[test]
fn test_owner_can_set_deposit_cap() {
    let (_, _, _, vault_addr, vault, _) = deploy_system();

    let cap = 1000 * ONE_TOKEN;

    start_cheat_caller_address(vault_addr, OWNER());
    vault.set_deposit_cap(cap);
    stop_cheat_caller_address(vault_addr);

    // Verify via max_deposit
    let max = vault.max_deposit(USER1());
    assert(max == cap, 'Cap not set correctly');
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_non_owner_cannot_set_deposit_cap() {
    let (_, _, _, vault_addr, vault, _) = deploy_system();

    start_cheat_caller_address(vault_addr, USER1());
    vault.set_deposit_cap(1000 * ONE_TOKEN);
    stop_cheat_caller_address(vault_addr);
}

// ============ Pause Tests ============

#[test]
fn test_owner_can_pause() {
    let (_, _, _, vault_addr, vault, _) = deploy_system();

    start_cheat_caller_address(vault_addr, OWNER());
    vault.pause();
    stop_cheat_caller_address(vault_addr);
}

#[test]
#[should_panic(expected: 'Pausable: paused')]
fn test_cannot_deposit_when_paused() {
    let (_, asset, _, vault_addr, vault, _) = deploy_system();

    // Pause
    start_cheat_caller_address(vault_addr, OWNER());
    vault.pause();
    stop_cheat_caller_address(vault_addr);

    // Try to deposit
    start_cheat_caller_address(asset.contract_address, USER1());
    asset.approve(vault_addr, ONE_TOKEN);
    stop_cheat_caller_address(asset.contract_address);

    start_cheat_caller_address(vault_addr, USER1());
    vault.deposit(ONE_TOKEN, USER1());
    stop_cheat_caller_address(vault_addr);
}

#[test]
#[should_panic(expected: 'Pausable: paused')]
fn test_cannot_withdraw_when_paused() {
    let (_, asset, _, vault_addr, vault, _) = deploy_system();

    // Deposit first
    approve_and_deposit(asset, vault_addr, vault, USER1(), 10 * ONE_TOKEN);

    // Pause
    start_cheat_caller_address(vault_addr, OWNER());
    vault.pause();
    stop_cheat_caller_address(vault_addr);

    // Try to withdraw
    start_cheat_caller_address(vault_addr, USER1());
    vault.withdraw(ONE_TOKEN, USER1(), USER1());
    stop_cheat_caller_address(vault_addr);
}

#[test]
fn test_can_operate_after_unpause() {
    let (_, asset, _, vault_addr, vault, _) = deploy_system();

    // Pause then unpause
    start_cheat_caller_address(vault_addr, OWNER());
    vault.pause();
    vault.unpause();
    stop_cheat_caller_address(vault_addr);

    // Should be able to deposit
    approve_and_deposit(asset, vault_addr, vault, USER1(), 10 * ONE_TOKEN);
    assert(vault.total_assets() == 10 * ONE_TOKEN, 'Should deposit after unpause');
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_non_owner_cannot_pause() {
    let (_, _, _, vault_addr, vault, _) = deploy_system();

    start_cheat_caller_address(vault_addr, USER1());
    vault.pause();
    stop_cheat_caller_address(vault_addr);
}

// ============ Stats Tests ============

#[test]
fn test_get_vault_stats() {
    let (_, asset, _, vault_addr, vault, _) = deploy_system();

    // Deposit
    approve_and_deposit(asset, vault_addr, vault, USER1(), 10 * ONE_TOKEN);
    approve_and_deposit(asset, vault_addr, vault, USER2(), 20 * ONE_TOKEN);

    let stats = vault.get_vault_stats();

    assert(stats.total_assets == 30 * ONE_TOKEN, 'Wrong total assets');
    assert(stats.total_shares == 30 * ONE_TOKEN, 'Wrong total shares'); // At t=0, 1:1
    assert(stats.chi == RAY, 'Wrong chi');
    assert(stats.vsr == VSR_4_PERCENT, 'Wrong vsr');
    assert(stats.depositor_count == 2, 'Wrong depositor count');
    assert(stats.deposit_cap == 0, 'Wrong deposit cap');
}

// ============ ERC4626 Preview Tests ============

#[test]
fn test_preview_deposit() {
    let (_, asset, _, vault_addr, vault, _) = deploy_system();

    let deposit_amount = 10 * ONE_TOKEN;

    // Preview should match actual
    let preview = vault.preview_deposit(deposit_amount);
    let actual = approve_and_deposit(asset, vault_addr, vault, USER1(), deposit_amount);

    assert(preview == actual, 'Preview should match actual');
}

#[test]
fn test_preview_redeem() {
    let (_, asset, _, vault_addr, vault, _) = deploy_system();

    // Deposit
    let shares = approve_and_deposit(asset, vault_addr, vault, USER1(), 10 * ONE_TOKEN);

    // Preview should match actual
    let preview = vault.preview_redeem(shares);

    start_cheat_caller_address(vault_addr, USER1());
    let actual = vault.redeem(shares, USER1(), USER1());
    stop_cheat_caller_address(vault_addr);

    assert(preview == actual, 'Preview should match actual');
}

#[test]
fn test_max_deposit() {
    let (_, _, _, vault_addr, vault, _) = deploy_system();

    // No cap - should be max u256
    let max = vault.max_deposit(USER1());
    assert(max == 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff, 'Should be unlimited');

    // Set cap
    let cap = 100 * ONE_TOKEN;
    start_cheat_caller_address(vault_addr, OWNER());
    vault.set_deposit_cap(cap);
    stop_cheat_caller_address(vault_addr);

    let new_max = vault.max_deposit(USER1());
    assert(new_max == cap, 'Should be cap');
}

#[test]
fn test_max_withdraw() {
    let (_, asset, _, vault_addr, vault, _) = deploy_system();

    // No deposit - max withdraw should be 0
    let max = vault.max_withdraw(USER1());
    assert(max == 0, 'Should be 0 with no deposit');

    // Deposit
    let deposit = 10 * ONE_TOKEN;
    approve_and_deposit(asset, vault_addr, vault, USER1(), deposit);

    let new_max = vault.max_withdraw(USER1());
    assert(new_max == deposit, 'Should be deposited amount');
}
