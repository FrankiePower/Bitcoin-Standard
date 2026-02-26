/// Mock wBTC Token Contract
///
/// A simple ERC20 token for testing purposes.
/// Simulates wrapped Bitcoin on Starknet.
/// Has a public mint function for testing (NOT for production).

use starknet::ContractAddress;

// ================================================================================================
// INTERFACE
// ================================================================================================

#[starknet::interface]
pub trait IMockWBTC<TContractState> {
    fn mint(ref self: TContractState, to: ContractAddress, amount: u256);
    fn burn(ref self: TContractState, from: ContractAddress, amount: u256);
}

#[starknet::contract]
pub mod MockWBTC {
    use core::num::traits::Zero;
    use openzeppelin_access::ownable::OwnableComponent;
    use openzeppelin_token::erc20::{ERC20Component, ERC20HooksEmptyImpl};
    use starknet::ContractAddress;

    // ================================================================================================
    // COMPONENTS
    // ================================================================================================

    component!(path: ERC20Component, storage: erc20, event: ERC20Event);
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    #[abi(embed_v0)]
    impl ERC20MixinImpl = ERC20Component::ERC20MixinImpl<ContractState>;
    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;

    impl ERC20ImmutableConfig of ERC20Component::ImmutableConfig {
        const DECIMALS: u8 = 8;
    }

    impl ERC20InternalImpl = ERC20Component::InternalImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    // ================================================================================================
    // STORAGE
    // ================================================================================================

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc20: ERC20Component::Storage,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
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
    }

    // ================================================================================================
    // CONSTRUCTOR
    // ================================================================================================

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.erc20.initializer("Wrapped Bitcoin", "wBTC");
        self.ownable.initializer(owner);
    }

    // ================================================================================================
    // IMOCKWBTC IMPLEMENTATION (TESTING ONLY)
    // ================================================================================================

    #[abi(embed_v0)]
    impl MockWBTCImpl of super::IMockWBTC<ContractState> {
        /// Mints tokens to any address. For testing only!
        fn mint(ref self: ContractState, to: ContractAddress, amount: u256) {
            assert(!to.is_zero(), 'MockWBTC: zero address');
            self.erc20.mint(to, amount);
        }

        /// Burns tokens from any address. For testing only!
        fn burn(ref self: ContractState, from: ContractAddress, amount: u256) {
            self.erc20.burn(from, amount);
        }
    }
}
