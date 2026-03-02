/// CDPCore Contract
///
/// Collateralized Debt Position engine for native Bitcoin vaults.
///
/// Flow:
///   1. User deposits BTC into an OP_CAT Taproot vault on Bitcoin (via `make deposit`)
///   2. User calls `register_vault(txid, btc_amount_sats)` here → stored in VaultRegistry
///   3. User calls `mint_debt(txid, amount)` → BTCUSD minted, health factor checked
///   4a. Happy path: user calls `repay_debt(txid, amount)` → debt cleared, vault closed
///   4b. Liquidation: CRE oracle detects health factor < 100% → calls `liquidate(txid)`
///       → BTCUSD debt burned, vault marked liquidated, Bitcoin OP_CAT covenant triggered
///
/// Health factor = (btc_collateral_usd * 100) / (debt_usd * MIN_CR)
///   > 100 = safe
///   = 100 = at liquidation threshold
///   < 100 = liquidatable

#[starknet::contract]
pub mod CDPCore {
    use contracts::interfaces::{
        IBTCUSDTokenDispatcher, IBTCUSDTokenDispatcherTrait, ICDPCore, IPriceOracleDispatcher,
        IPriceOracleDispatcherTrait, IVaultRegistryDispatcher, IVaultRegistryDispatcherTrait,
    };
    use core::num::traits::Zero;
    use openzeppelin_access::ownable::OwnableComponent;
    use openzeppelin_security::pausable::PausableComponent;
    use openzeppelin_security::reentrancyguard::ReentrancyGuardComponent;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address};

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: PausableComponent, storage: pausable, event: PausableEvent);
    component!(
        path: ReentrancyGuardComponent, storage: reentrancy_guard, event: ReentrancyGuardEvent,
    );

    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;

    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;
    impl PausableInternalImpl = PausableComponent::InternalImpl<ContractState>;
    impl ReentrancyGuardInternalImpl = ReentrancyGuardComponent::InternalImpl<ContractState>;

    // ================================
    // Risk parameters
    // ================================

    /// Minimum collateral ratio (150%). Liquidatable below this.
    const MIN_CR: u256 = 150;
    /// Oracle price decimals: prices are e.g. 50000_00000000 for $50,000
    const ORACLE_DECIMALS: u256 = 100_000_000; // 1e8
    /// Satoshi precision: 1 BTC = 100_000_000 sats
    const SAT_PRECISION: u256 = 100_000_000; // 1e8
    /// BTCUSD decimals: 18
    const TOKEN_DECIMALS: u256 = 1_000_000_000_000_000_000; // 1e18

    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        pausable: PausableComponent::Storage,
        #[substorage(v0)]
        reentrancy_guard: ReentrancyGuardComponent::Storage,
        /// VaultRegistry contract
        registry: ContractAddress,
        /// BTCUSDToken contract
        btcusd_token: ContractAddress,
        /// Price oracle (BTC/USD)
        oracle: ContractAddress,
        /// txid → BTCUSD debt (18 decimals)
        debt: Map<felt252, u256>,
        /// Protocol totals
        total_debt: u256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        PausableEvent: PausableComponent::Event,
        #[flat]
        ReentrancyGuardEvent: ReentrancyGuardComponent::Event,
        VaultRegistered: VaultRegistered,
        DebtMinted: DebtMinted,
        DebtRepaid: DebtRepaid,
        VaultLiquidated: VaultLiquidated,
    }

    #[derive(Drop, starknet::Event)]
    pub struct VaultRegistered {
        #[key]
        pub txid: felt252,
        #[key]
        pub owner: ContractAddress,
        pub btc_amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct DebtMinted {
        #[key]
        pub txid: felt252,
        pub amount: u256,
        pub health_factor: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct DebtRepaid {
        #[key]
        pub txid: felt252,
        pub amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct VaultLiquidated {
        #[key]
        pub txid: felt252,
        pub debt_burned: u256,
        pub btc_amount: u256,
    }

    pub mod Errors {
        pub const VAULT_NOT_OWNED: felt252 = 'CDP: not vault owner';
        pub const INSUFFICIENT_COLLATERAL: felt252 = 'CDP: undercollateralized';
        pub const NO_DEBT: felt252 = 'CDP: no debt to repay';
        pub const AMOUNT_EXCEEDS_DEBT: felt252 = 'CDP: amount exceeds debt';
        pub const NOT_LIQUIDATABLE: felt252 = 'CDP: health factor ok';
        pub const STALE_PRICE: felt252 = 'CDP: stale oracle price';
        pub const ZERO_AMOUNT: felt252 = 'CDP: zero amount';
        pub const ZERO_ADDRESS: felt252 = 'CDP: zero address';
        pub const VAULT_NOT_ACTIVE: felt252 = 'CDP: vault not active';
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        registry: ContractAddress,
        btcusd_token: ContractAddress,
        oracle: ContractAddress,
    ) {
        self.ownable.initializer(owner);
        assert(!registry.is_zero(), Errors::ZERO_ADDRESS);
        assert(!btcusd_token.is_zero(), Errors::ZERO_ADDRESS);
        assert(!oracle.is_zero(), Errors::ZERO_ADDRESS);
        self.registry.write(registry);
        self.btcusd_token.write(btcusd_token);
        self.oracle.write(oracle);
    }

    #[abi(embed_v0)]
    impl CDPCoreImpl of ICDPCore<ContractState> {
        /// Register a Bitcoin vault. Must be called after depositing BTC on-chain.
        /// `txid` = first 31 bytes of the Bitcoin deposit txid as felt252.
        /// `btc_amount` = deposited amount in satoshis (e.g. 100_000_000 = 1 BTC).
        fn register_vault(ref self: ContractState, txid: felt252, btc_amount: u256) {
            self.pausable.assert_not_paused();
            assert(btc_amount > 0, Errors::ZERO_AMOUNT);
            let caller = get_caller_address();
            IVaultRegistryDispatcher { contract_address: self.registry.read() }
                .register_vault(txid, caller, btc_amount);
            self.emit(VaultRegistered { txid, owner: caller, btc_amount });
        }

        /// Mint BTCUSD stablecoin debt against a registered Bitcoin vault.
        /// Health factor must remain >= MIN_CR (150%) after minting.
        fn mint_debt(ref self: ContractState, txid: felt252, amount: u256) {
            self.reentrancy_guard.start();
            self.pausable.assert_not_paused();
            assert(amount > 0, Errors::ZERO_AMOUNT);
            let caller = get_caller_address();

            // Verify ownership and active state
            let registry = IVaultRegistryDispatcher { contract_address: self.registry.read() };
            assert(registry.is_active(txid), Errors::VAULT_NOT_ACTIVE);
            assert(registry.get_owner(txid) == caller, Errors::VAULT_NOT_OWNED);

            // Check health factor after hypothetical mint
            let btc_amount = registry.get_btc_amount(txid);
            let new_debt = self.debt.read(txid) + amount;
            let hf = self._health_factor(btc_amount, new_debt);
            assert(hf >= 100, Errors::INSUFFICIENT_COLLATERAL);

            // Update state and mint
            self.debt.write(txid, new_debt);
            self.total_debt.write(self.total_debt.read() + amount);
            IBTCUSDTokenDispatcher { contract_address: self.btcusd_token.read() }
                .mint(caller, amount);

            self.emit(DebtMinted { txid, amount, health_factor: hf });
            self.reentrancy_guard.end();
        }

        /// Repay BTCUSD debt. Caller must have approved CDPCore to burn from their balance.
        /// When all debt is cleared, the vault is closed (BTC can be reclaimed on Bitcoin).
        fn repay_debt(ref self: ContractState, txid: felt252, amount: u256) {
            self.reentrancy_guard.start();
            self.pausable.assert_not_paused();
            assert(amount > 0, Errors::ZERO_AMOUNT);

            let registry = IVaultRegistryDispatcher { contract_address: self.registry.read() };
            assert(registry.is_active(txid), Errors::VAULT_NOT_ACTIVE);
            assert(registry.get_owner(txid) == get_caller_address(), Errors::VAULT_NOT_OWNED);

            let current_debt = self.debt.read(txid);
            assert(current_debt > 0, Errors::NO_DEBT);
            assert(amount <= current_debt, Errors::AMOUNT_EXCEEDS_DEBT);

            let new_debt = current_debt - amount;
            self.debt.write(txid, new_debt);
            self.total_debt.write(self.total_debt.read() - amount);
            IBTCUSDTokenDispatcher { contract_address: self.btcusd_token.read() }
                .burn(get_caller_address(), amount);

            // Close vault when fully repaid
            if new_debt == 0 {
                registry.close_vault(txid);
            }

            self.emit(DebtRepaid { txid, amount });
            self.reentrancy_guard.end();
        }

        /// Liquidate an undercollateralized vault.
        /// Called by the Chainlink CRE oracle when health factor drops below 100%.
        /// Burns outstanding debt and marks the vault liquidated.
        /// The corresponding Bitcoin OP_CAT covenant transaction must also be submitted on Bitcoin.
        fn liquidate(ref self: ContractState, txid: felt252) {
            self.reentrancy_guard.start();
            self.pausable.assert_not_paused();

            let registry = IVaultRegistryDispatcher { contract_address: self.registry.read() };
            assert(registry.is_active(txid), Errors::VAULT_NOT_ACTIVE);

            let btc_amount = registry.get_btc_amount(txid);
            let debt = self.debt.read(txid);
            let hf = self._health_factor(btc_amount, debt);
            assert(hf < 100, Errors::NOT_LIQUIDATABLE);

            // Burn the debt and close the vault
            let owner = registry.get_owner(txid);
            self.debt.write(txid, 0);
            self.total_debt.write(self.total_debt.read() - debt);
            if debt > 0 {
                IBTCUSDTokenDispatcher { contract_address: self.btcusd_token.read() }
                    .burn(owner, debt);
            }
            registry.liquidate_vault(txid);

            self.emit(VaultLiquidated { txid, debt_burned: debt, btc_amount });
            self.reentrancy_guard.end();
        }

        /// Returns health factor as a percentage where 100 = 150% CR threshold.
        /// Example: 133 = 200% CR (safe), 66 = 100% CR (deeply underwater).
        /// Reverts with stale price error if oracle data is too old.
        fn get_health_factor(self: @ContractState, txid: felt252) -> u256 {
            let registry = IVaultRegistryDispatcher { contract_address: self.registry.read() };
            let btc_amount = registry.get_btc_amount(txid);
            let debt = self.debt.read(txid);
            if debt == 0 {
                // No debt = maximum health factor
                return 999_999;
            }
            self._health_factor(btc_amount, debt)
        }

        /// Returns (btc_amount_sats, debt_btcusd_18dec) for a vault.
        fn get_position(self: @ContractState, txid: felt252) -> (u256, u256) {
            let btc_amount = IVaultRegistryDispatcher { contract_address: self.registry.read() }
                .get_btc_amount(txid);
            (btc_amount, self.debt.read(txid))
        }

        /// Protocol-level stats: (total_btc_locked_sats, total_debt_btcusd).
        /// Note: total_btc is approximated as sum across all vaults (registry tracks per-vault).
        fn get_protocol_stats(self: @ContractState) -> (u256, u256) {
            // total_debt is tracked directly; total_btc would require enumeration (omit for now)
            (0, self.total_debt.read())
        }

        // ==============================
        // Admin
        // ==============================

        fn pause(ref self: ContractState) {
            self.ownable.assert_only_owner();
            self.pausable.pause();
        }

        fn unpause(ref self: ContractState) {
            self.ownable.assert_only_owner();
            self.pausable.unpause();
        }

        fn set_oracle(ref self: ContractState, new_oracle: ContractAddress) {
            self.ownable.assert_only_owner();
            assert(!new_oracle.is_zero(), Errors::ZERO_ADDRESS);
            self.oracle.write(new_oracle);
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        /// Health factor calculation:
        ///   collateral_usd (8 dec) = btc_sats * price / SAT_PRECISION
        ///   debt_usd (8 dec)       = debt_18dec * ORACLE_DECIMALS / TOKEN_DECIMALS
        ///   health_factor          = collateral_usd * 100 / (debt_usd * MIN_CR / 100)
        ///                          = collateral_usd * 10000 / (debt_usd * MIN_CR)
        ///   >= 100 means safe (collateral covers MIN_CR * debt)
        fn _health_factor(self: @ContractState, btc_sats: u256, debt_18dec: u256) -> u256 {
            if debt_18dec == 0 {
                return 999_999;
            }
            let oracle = IPriceOracleDispatcher { contract_address: self.oracle.read() };
            assert(!oracle.is_price_stale(), Errors::STALE_PRICE);
            let (price, _) = oracle.get_btc_price();

            // collateral value in USD (8 decimal places)
            let collateral_usd = btc_sats * price / SAT_PRECISION;
            // debt in USD (8 decimal places)
            let debt_usd = debt_18dec * ORACLE_DECIMALS / TOKEN_DECIMALS;

            // health_factor (scaled: 100 = at liquidation threshold with MIN_CR=150%)
            // formula: hf = (collateral / debt) * (100 / MIN_CR) * 100
            //             = collateral_usd * 10000 / (debt_usd * MIN_CR)
            collateral_usd * 10000 / (debt_usd * MIN_CR)
        }
    }
}
