/// BTS Savings Vault
///
/// ERC4626-compliant yield-bearing vault with continuous rate accumulation.
/// Based on Spark Vaults V2 / MakerDAO sUSDS architecture.
///
/// Users deposit an underlying asset (wBTC, BTSUSD, or STRK) and receive
/// share tokens whose value appreciates over time via the Vault Savings Rate (VSR).
///
/// Key mechanics:
///   - `chi`: Rate accumulator tracking cumulative growth (ray precision, 1e27)
///   - `rho`: Timestamp of last chi update
///   - `vsr`: Per-second savings rate (ray, e.g. 1e27 + delta for ~4% APY)
///   - `totalAssets = totalShares * nowChi() / RAY`
///
/// Security invariants:
///   1. Share tokens are always backed: shares * chi / RAY <= held + outstanding assets
///   2. Only owner can set VSR and deposit cap
///   3. Deposit cap is enforced on all deposits

#[starknet::contract]
pub mod BTSSavingsVault {
    use contracts::savings::interfaces::{IBTSSavingsVault, VaultStats};
    use core::num::traits::Zero;
    use openzeppelin_access::ownable::OwnableComponent;
    use openzeppelin_security::pausable::PausableComponent;
    use openzeppelin_security::reentrancyguard::ReentrancyGuardComponent;
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use openzeppelin_token::erc20::{ERC20Component, ERC20HooksEmptyImpl};
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address, get_contract_address};

    // ================================================================================================
    // COMPONENTS
    // ================================================================================================

    component!(path: ERC20Component, storage: erc20, event: ERC20Event);
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: PausableComponent, storage: pausable, event: PausableEvent);
    component!(path: ReentrancyGuardComponent, storage: reentrancy, event: ReentrancyEvent);

    #[abi(embed_v0)]
    impl ERC20MixinImpl = ERC20Component::ERC20MixinImpl<ContractState>;
    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;

    impl ERC20ImmutableConfig of ERC20Component::ImmutableConfig {
        const DECIMALS: u8 = 18;
    }

    impl ERC20InternalImpl = ERC20Component::InternalImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;
    impl PausableInternalImpl = PausableComponent::InternalImpl<ContractState>;
    impl ReentrancyInternalImpl = ReentrancyGuardComponent::InternalImpl<ContractState>;

    // ================================================================================================
    // CONSTANTS
    // ================================================================================================

    /// RAY = 1e27, the base unit for chi and vsr.
    const RAY: u256 = 1000000000000000000000000000; // 1e27

    // ================================================================================================
    // STORAGE
    // ================================================================================================

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc20: ERC20Component::Storage,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        pausable: PausableComponent::Storage,
        #[substorage(v0)]
        reentrancy: ReentrancyGuardComponent::Storage,
        /// Address of the underlying asset token (wBTC, BTSUSD, STRK, etc.)
        underlying_asset: ContractAddress,
        /// Rate accumulator: tracks cumulative growth. Starts at RAY.
        chi: u256,
        /// Timestamp of last chi update.
        rho: u64,
        /// Vault Savings Rate: per-second rate in ray.
        /// 1e27 = 0% APY. To get ~4% APY: 1000000001243680656318820312
        vsr: u256,
        /// Total shares outstanding (mirrors ERC20 totalSupply but stored for gas).
        total_shares: u256,
        /// Maximum total assets allowed (0 = unlimited).
        deposit_cap: u256,
        /// Track unique depositors.
        depositor_count: u256,
        /// Whether an address has ever deposited (for counting).
        is_depositor: Map<ContractAddress, bool>,
    }

    // ================================================================================================
    // EVENTS
    // ================================================================================================

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        #[flat]
        ERC20Event: ERC20Component::Event,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        PausableEvent: PausableComponent::Event,
        #[flat]
        ReentrancyEvent: ReentrancyGuardComponent::Event,
        Deposit: Deposit,
        Withdraw: Withdraw,
        VSRUpdated: VSRUpdated,
        DepositCapUpdated: DepositCapUpdated,
    }

    /// ERC4626 Deposit event.
    #[derive(Drop, starknet::Event)]
    pub struct Deposit {
        #[key]
        pub sender: ContractAddress,
        #[key]
        pub owner: ContractAddress,
        pub assets: u256,
        pub shares: u256,
    }

    /// ERC4626 Withdraw event.
    #[derive(Drop, starknet::Event)]
    pub struct Withdraw {
        #[key]
        pub sender: ContractAddress,
        #[key]
        pub receiver: ContractAddress,
        #[key]
        pub owner: ContractAddress,
        pub assets: u256,
        pub shares: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct VSRUpdated {
        pub old_vsr: u256,
        pub new_vsr: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct DepositCapUpdated {
        pub old_cap: u256,
        pub new_cap: u256,
    }

    // ================================================================================================
    // ERRORS
    // ================================================================================================

    pub mod Errors {
        pub const ZERO_ADDRESS: felt252 = 'SV: zero address';
        pub const ZERO_AMOUNT: felt252 = 'SV: zero amount';
        pub const ZERO_SHARES: felt252 = 'SV: zero shares';
        pub const DEPOSIT_CAP_EXCEEDED: felt252 = 'SV: deposit cap exceeded';
        pub const INSUFFICIENT_BALANCE: felt252 = 'SV: insufficient balance';
        pub const INSUFFICIENT_ALLOWANCE: felt252 = 'SV: insufficient allowance';
        pub const VSR_TOO_LOW: felt252 = 'SV: vsr below RAY';
    }

    // ================================================================================================
    // CONSTRUCTOR
    // ================================================================================================

    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        asset: ContractAddress,
        name: ByteArray,
        symbol: ByteArray,
        initial_vsr: u256,
    ) {
        assert(!owner.is_zero(), Errors::ZERO_ADDRESS);
        assert(!asset.is_zero(), Errors::ZERO_ADDRESS);
        assert(initial_vsr >= RAY, Errors::VSR_TOO_LOW);

        self.ownable.initializer(owner);
        self.erc20.initializer(name, symbol);

        self.underlying_asset.write(asset);
        self.chi.write(RAY);
        self.rho.write(get_block_timestamp());
        self.vsr.write(initial_vsr);
        self.total_shares.write(0);
        self.deposit_cap.write(0); // unlimited
        self.depositor_count.write(0);
    }

    // ================================================================================================
    // IBTSSavingsVault IMPLEMENTATION
    // ================================================================================================

    #[abi(embed_v0)]
    impl BTSSavingsVaultImpl of IBTSSavingsVault<ContractState> {
        // ── ERC4626 Core
        // ────────────────────────────────────────────

        fn asset(self: @ContractState) -> ContractAddress {
            self.underlying_asset.read()
        }

        fn total_assets(self: @ContractState) -> u256 {
            let shares = self.total_shares.read();
            if shares == 0 {
                return 0;
            }
            shares * self._now_chi() / RAY
        }

        fn deposit(ref self: ContractState, assets: u256, receiver: ContractAddress) -> u256 {
            self.pausable.assert_not_paused();
            self.reentrancy.start();

            assert(assets > 0, Errors::ZERO_AMOUNT);
            assert(!receiver.is_zero(), Errors::ZERO_ADDRESS);

            // Drip: update chi to current timestamp
            self._drip();

            let shares = self._convert_to_shares(assets);
            assert(shares > 0, Errors::ZERO_SHARES);

            // Check deposit cap
            let cap = self.deposit_cap.read();
            if cap > 0 {
                let new_total = self.total_assets() + assets;
                assert(new_total <= cap, Errors::DEPOSIT_CAP_EXCEEDED);
            }

            // Transfer underlying asset from caller
            let caller = get_caller_address();
            let asset_token = IERC20Dispatcher { contract_address: self.underlying_asset.read() };
            asset_token.transfer_from(caller, get_contract_address(), assets);

            // Mint share tokens to receiver
            self.erc20.mint(receiver, shares);
            self.total_shares.write(self.total_shares.read() + shares);

            // Track depositor
            self._track_depositor(receiver);

            self.emit(Deposit { sender: caller, owner: receiver, assets, shares });
            self.reentrancy.end();
            shares
        }

        fn withdraw(
            ref self: ContractState,
            assets: u256,
            receiver: ContractAddress,
            owner: ContractAddress,
        ) -> u256 {
            self.pausable.assert_not_paused();
            self.reentrancy.start();

            assert(assets > 0, Errors::ZERO_AMOUNT);
            assert(!receiver.is_zero(), Errors::ZERO_ADDRESS);

            self._drip();

            let shares = self._convert_to_shares_round_up(assets);
            assert(shares > 0, Errors::ZERO_SHARES);

            let caller = get_caller_address();
            self._spend_allowance(owner, caller, shares);

            // Burn shares from owner
            self.erc20.burn(owner, shares);
            self.total_shares.write(self.total_shares.read() - shares);

            // Transfer underlying to receiver
            let asset_token = IERC20Dispatcher { contract_address: self.underlying_asset.read() };
            asset_token.transfer(receiver, assets);

            self.emit(Withdraw { sender: caller, receiver, owner, assets, shares });
            self.reentrancy.end();
            shares
        }

        fn mint_shares(ref self: ContractState, shares: u256, receiver: ContractAddress) -> u256 {
            self.pausable.assert_not_paused();
            self.reentrancy.start();

            assert(shares > 0, Errors::ZERO_SHARES);
            assert(!receiver.is_zero(), Errors::ZERO_ADDRESS);

            self._drip();

            let assets = self._convert_to_assets_round_up(shares);
            assert(assets > 0, Errors::ZERO_AMOUNT);

            // Check deposit cap
            let cap = self.deposit_cap.read();
            if cap > 0 {
                let new_total = self.total_assets() + assets;
                assert(new_total <= cap, Errors::DEPOSIT_CAP_EXCEEDED);
            }

            let caller = get_caller_address();
            let asset_token = IERC20Dispatcher { contract_address: self.underlying_asset.read() };
            asset_token.transfer_from(caller, get_contract_address(), assets);

            self.erc20.mint(receiver, shares);
            self.total_shares.write(self.total_shares.read() + shares);
            self._track_depositor(receiver);

            self.emit(Deposit { sender: caller, owner: receiver, assets, shares });
            self.reentrancy.end();
            assets
        }

        fn redeem(
            ref self: ContractState,
            shares: u256,
            receiver: ContractAddress,
            owner: ContractAddress,
        ) -> u256 {
            self.pausable.assert_not_paused();
            self.reentrancy.start();

            assert(shares > 0, Errors::ZERO_SHARES);
            assert(!receiver.is_zero(), Errors::ZERO_ADDRESS);

            self._drip();

            let assets = self._convert_to_assets(shares);
            assert(assets > 0, Errors::ZERO_AMOUNT);

            let caller = get_caller_address();
            self._spend_allowance(owner, caller, shares);

            self.erc20.burn(owner, shares);
            self.total_shares.write(self.total_shares.read() - shares);

            let asset_token = IERC20Dispatcher { contract_address: self.underlying_asset.read() };
            asset_token.transfer(receiver, assets);

            self.emit(Withdraw { sender: caller, receiver, owner, assets, shares });
            self.reentrancy.end();
            assets
        }

        // ── ERC4626 Accounting
        // ──────────────────────────────────────

        fn convert_to_shares(self: @ContractState, assets: u256) -> u256 {
            self._convert_to_shares(assets)
        }

        fn convert_to_assets(self: @ContractState, shares: u256) -> u256 {
            self._convert_to_assets(shares)
        }

        fn max_deposit(self: @ContractState, owner: ContractAddress) -> u256 {
            let cap = self.deposit_cap.read();
            if cap == 0 {
                // Unlimited — return a large number
                return 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
            }
            let current = self.total_assets();
            if cap > current {
                cap - current
            } else {
                0
            }
        }

        fn max_mint(self: @ContractState, owner: ContractAddress) -> u256 {
            let max_assets = self.max_deposit(owner);
            self._convert_to_shares(max_assets)
        }

        fn max_withdraw(self: @ContractState, owner: ContractAddress) -> u256 {
            self._convert_to_assets(self.erc20.balance_of(owner))
        }

        fn max_redeem(self: @ContractState, owner: ContractAddress) -> u256 {
            self.erc20.balance_of(owner)
        }

        fn preview_deposit(self: @ContractState, assets: u256) -> u256 {
            self._convert_to_shares(assets)
        }

        fn preview_mint(self: @ContractState, shares: u256) -> u256 {
            self._convert_to_assets_round_up(shares)
        }

        fn preview_withdraw(self: @ContractState, assets: u256) -> u256 {
            self._convert_to_shares_round_up(assets)
        }

        fn preview_redeem(self: @ContractState, shares: u256) -> u256 {
            self._convert_to_assets(shares)
        }

        // ── Spark-style Extensions
        // ──────────────────────────────────

        fn now_chi(self: @ContractState) -> u256 {
            self._now_chi()
        }

        fn assets_of(self: @ContractState, user: ContractAddress) -> u256 {
            let shares = self.erc20.balance_of(user);
            if shares == 0 {
                return 0;
            }
            shares * self._now_chi() / RAY
        }

        fn assets_outstanding(self: @ContractState) -> u256 {
            let total = self.total_assets();
            let asset_token = IERC20Dispatcher { contract_address: self.underlying_asset.read() };
            let idle = asset_token.balance_of(get_contract_address());
            if total > idle {
                total - idle
            } else {
                0
            }
        }

        fn get_vault_stats(self: @ContractState) -> VaultStats {
            let total_assets = self.total_assets();
            let asset_token = IERC20Dispatcher { contract_address: self.underlying_asset.read() };
            let idle = asset_token.balance_of(get_contract_address());
            let outstanding = if total_assets > idle {
                total_assets - idle
            } else {
                0
            };

            VaultStats {
                total_assets,
                total_shares: self.total_shares.read(),
                chi: self._now_chi(),
                vsr: self.vsr.read(),
                idle_assets: idle,
                assets_outstanding: outstanding,
                depositor_count: self.depositor_count.read(),
                deposit_cap: self.deposit_cap.read(),
            }
        }

        fn get_vsr(self: @ContractState) -> u256 {
            self.vsr.read()
        }

        fn get_rho(self: @ContractState) -> u64 {
            self.rho.read()
        }

        fn get_depositor_count(self: @ContractState) -> u256 {
            self.depositor_count.read()
        }

        // ── Admin
        // ───────────────────────────────────────────────────

        fn set_vsr(ref self: ContractState, new_vsr: u256) {
            self.ownable.assert_only_owner();
            assert(new_vsr >= RAY, Errors::VSR_TOO_LOW);

            // Drip before changing rate to lock in accumulated value
            self._drip();

            let old_vsr = self.vsr.read();
            self.vsr.write(new_vsr);
            self.emit(VSRUpdated { old_vsr, new_vsr });
        }

        fn set_deposit_cap(ref self: ContractState, cap: u256) {
            self.ownable.assert_only_owner();
            let old_cap = self.deposit_cap.read();
            self.deposit_cap.write(cap);
            self.emit(DepositCapUpdated { old_cap, new_cap: cap });
        }

        fn pause(ref self: ContractState) {
            self.ownable.assert_only_owner();
            self.pausable.pause();
        }

        fn unpause(ref self: ContractState) {
            self.ownable.assert_only_owner();
            self.pausable.unpause();
        }
    }

    // ================================================================================================
    // INTERNAL
    // ================================================================================================

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        /// Calculates the current chi at block.timestamp without writing to storage.
        /// Formula: chi_new = chi_old * vsr^(now - rho) / RAY
        ///
        /// Uses repeated squaring for exponentiation.
        fn _now_chi(self: @ContractState) -> u256 {
            let chi = self.chi.read();
            let rho = self.rho.read();
            let now = get_block_timestamp();

            if now <= rho {
                return chi;
            }

            let vsr = self.vsr.read();
            let delta: u256 = (now - rho).into();

            // vsr^delta via repeated squaring in ray arithmetic
            let vsr_pow = Self::_rpow(vsr, delta, RAY);
            chi * vsr_pow / RAY
        }

        /// Updates chi to current timestamp ("drips" accumulated yield).
        fn _drip(ref self: ContractState) {
            let now = get_block_timestamp();
            let rho = self.rho.read();

            if now <= rho {
                return;
            }

            let new_chi = self._now_chi();
            self.chi.write(new_chi);
            self.rho.write(now);
        }

        /// Converts assets to shares: shares = assets * RAY / chi
        fn _convert_to_shares(self: @ContractState, assets: u256) -> u256 {
            let chi = self._now_chi();
            if chi == 0 {
                return assets; // 1:1 if uninitialized
            }
            assets * RAY / chi
        }

        /// Converts assets to shares, rounding up (favors vault on withdrawals).
        fn _convert_to_shares_round_up(self: @ContractState, assets: u256) -> u256 {
            let chi = self._now_chi();
            if chi == 0 {
                return assets;
            }
            let numerator = assets * RAY;
            (numerator + chi - 1) / chi
        }

        /// Converts shares to assets: assets = shares * chi / RAY
        fn _convert_to_assets(self: @ContractState, shares: u256) -> u256 {
            let chi = self._now_chi();
            shares * chi / RAY
        }

        /// Converts shares to assets, rounding up (favors depositor on minting).
        fn _convert_to_assets_round_up(self: @ContractState, shares: u256) -> u256 {
            let chi = self._now_chi();
            let numerator = shares * chi;
            (numerator + RAY - 1) / RAY
        }

        /// Spends share allowance if caller != owner.
        fn _spend_allowance(
            ref self: ContractState, owner: ContractAddress, spender: ContractAddress, amount: u256,
        ) {
            if owner != spender {
                let current_allowance = self.erc20.allowance(owner, spender);
                assert(current_allowance >= amount, Errors::INSUFFICIENT_ALLOWANCE);
                // Use the ERC20 component to update allowance
                self.erc20._approve(owner, spender, current_allowance - amount);
            }
        }

        /// Tracks a new depositor for the counter.
        fn _track_depositor(ref self: ContractState, user: ContractAddress) {
            if !self.is_depositor.entry(user).read() {
                self.is_depositor.entry(user).write(true);
                self.depositor_count.write(self.depositor_count.read() + 1);
            }
        }

        /// Raise `x` to the power `n` in ray arithmetic, using repeated squaring.
        /// Equivalent to MakerDAO's `rpow`.
        ///
        /// rpow(x, n, b) = x^n where x and result are in base `b` (RAY).
        fn _rpow(x: u256, n: u256, b: u256) -> u256 {
            let mut result = b; // starts at 1.0 in ray
            let mut base = x;
            let mut exp = n;

            // If exponent is 0, return 1.0
            if exp == 0 {
                return result;
            }

            loop {
                if exp == 0 {
                    break;
                }

                // If exp is odd, multiply result by base
                if exp % 2 == 1 {
                    result = result * base / b;
                }

                exp = exp / 2;
                if exp > 0 {
                    base = base * base / b;
                }
            }

            result
        }
    }
}
