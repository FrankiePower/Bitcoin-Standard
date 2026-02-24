/// BTSUSD Token Contract
///
/// ERC20 stablecoin backed by Bitcoin collateral held in the vault.
/// Only the vault contract can mint and burn; the owner can pause in emergencies.

#[starknet::contract]
pub mod BTSUSDToken {
    use core::num::traits::Zero;
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use openzeppelin_token::erc20::{ERC20Component, ERC20HooksEmptyImpl};
    use openzeppelin_access::ownable::OwnableComponent;
    use openzeppelin_security::pausable::PausableComponent;
    use openzeppelin_security::interface::IPausable;
    use contracts::interfaces::IBTSUSDToken;

    // ================================================================================================
    // COMPONENTS
    // ================================================================================================

    component!(path: ERC20Component, storage: erc20, event: ERC20Event);
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: PausableComponent, storage: pausable, event: PausableEvent);

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
        /// Only this address may call mint / burn.
        vault: ContractAddress,
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
        VaultUpdated: VaultUpdated,
    }

    #[derive(Drop, starknet::Event)]
    pub struct VaultUpdated {
        #[key]
        pub old_vault: ContractAddress,
        #[key]
        pub new_vault: ContractAddress,
    }

    // ================================================================================================
    // ERRORS
    // ================================================================================================

    pub mod Errors {
        pub const ONLY_VAULT: felt252 = 'BTSUSD: caller is not vault';
        pub const ZERO_ADDRESS: felt252 = 'BTSUSD: zero address';
        pub const ZERO_AMOUNT: felt252 = 'BTSUSD: zero amount';
    }

    // ================================================================================================
    // CONSTRUCTOR
    // ================================================================================================

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, vault: ContractAddress) {
        self.erc20.initializer("Bitcoin USD Stablecoin", "BTSUSD");
        self.ownable.initializer(owner);
        assert(!vault.is_zero(), Errors::ZERO_ADDRESS);
        self.vault.write(vault);
    }

    // ================================================================================================
    // IBTSUSDTOKEN IMPLEMENTATION
    // ================================================================================================

    #[abi(embed_v0)]
    impl BTSUSDTokenImpl of IBTSUSDToken<ContractState> {
        fn mint(ref self: ContractState, to: ContractAddress, amount: u256) {
            self._assert_only_vault();
            assert(!to.is_zero(), Errors::ZERO_ADDRESS);
            assert(amount > 0, Errors::ZERO_AMOUNT);
            self.pausable.assert_not_paused();
            self.erc20.mint(to, amount);
        }

        fn burn(ref self: ContractState, from: ContractAddress, amount: u256) {
            self._assert_only_vault();
            assert(!from.is_zero(), Errors::ZERO_ADDRESS);
            assert(amount > 0, Errors::ZERO_AMOUNT);
            self.pausable.assert_not_paused();
            self.erc20.burn(from, amount);
        }

        fn set_vault(ref self: ContractState, new_vault: ContractAddress) {
            self.ownable.assert_only_owner();
            assert(!new_vault.is_zero(), Errors::ZERO_ADDRESS);
            let old_vault = self.vault.read();
            self.vault.write(new_vault);
            self.emit(VaultUpdated { old_vault, new_vault });
        }

        fn get_vault(self: @ContractState) -> ContractAddress {
            self.vault.read()
        }

        fn pause(ref self: ContractState) {
            self.ownable.assert_only_owner();
            self.pausable.pause();
        }

        fn unpause(ref self: ContractState) {
            self.ownable.assert_only_owner();
            self.pausable.unpause();
        }

        fn get_paused_status(self: @ContractState) -> bool {
            self.pausable.is_paused()
        }
    }

    // ================================================================================================
    // INTERNAL
    // ================================================================================================

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _assert_only_vault(self: @ContractState) {
            assert(get_caller_address() == self.vault.read(), Errors::ONLY_VAULT);
        }
    }
}
