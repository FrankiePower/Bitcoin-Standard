BIN          := ./target/release/standard_vault
BITCOIN_DIR  := ./bitcoin-data
BCLI         := ./bitcoin-core-cat/src/bitcoin-cli -regtest -rpcuser=user -rpcpassword=password

.PHONY: status deposit repay liquidate timeout \
        build bootstrap start-bitcoind stop-bitcoind clean-bitcoin-data

#################
# Demo commands #
#################

status:
	RUST_LOG=info $(BIN) status

deposit:
	RUST_LOG=info $(BIN) deposit

repay:
	RUST_LOG=info $(BIN) repay $$($(BCLI) -rpcwallet=miner getnewaddress)

liquidate:
	RUST_LOG=info $(BIN) liquidate

timeout:
	RUST_LOG=info $(BIN) timeout $$($(BCLI) -rpcwallet=miner getnewaddress)

#######################
# Bootstrap commands  #
#######################

bootstrap:
	bash ./scripts/build_bitcoincore.sh
	$(MAKE) build
	$(MAKE) clean-bitcoin-data
	$(MAKE) start-bitcoind

build:
	cargo build --release

start-bitcoind:
	mkdir -p $(BITCOIN_DIR)
	./bitcoin-core-cat/src/bitcoind \
		-regtest \
		-timeout=15000 \
		-server=1 \
		-txindex=1 \
		-rpcuser=user \
		-rpcpassword=password \
		-datadir=$(BITCOIN_DIR)

stop-bitcoind:
	$(BCLI) stop

clean-bitcoin-data:
	rm -rf $(BITCOIN_DIR)
