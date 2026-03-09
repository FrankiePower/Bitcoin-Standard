# Connect to Xverse Wallet

## Request to connect your app to your user's Xverse wallet

An app can easily connect to the Xverse Wallet using `wallet_connect`. This method grants read permissions on the account selected by the user and returns commonly used data about the account, such as addresses and current network.

You can optionally specify:

* which wallet addresses you require from the wallet account: Bitcoin ordinals address, Bitcoin payment address, Spark, Starknet or Stacks address, using the optional `addresses` request parameter.
* a custom connection `message` to show the user. You can use it to present your app and state the purpose of the connection request.
* the `network` the wallet should use to connect to your app

<table><thead><tr><th width="205">request parameters</th><th>Description</th></tr></thead><tbody><tr><td><code>addresses</code><br><span data-gb-custom-inline data-tag="emoji" data-code="2139">ℹ️</span> Optional</td><td><p>an array of strings used to specify which address(es) to request from the user's Xverse wallet account:</p><ul><li><code>'ordinals'</code> is preferably used to manage the user’s ordinals</li><li><code>'payment'</code> is preferably used to manage the user’s bitcoin</li><li><code>'stacks'</code> is used to interact with the Stacks ecosystem</li><li><code>'spark'</code> is used to interact with the Spark ecosystem</li><li><code>'starknet'</code> is used to interact with the Starknet ecosystem</li></ul><p>Example: <code>['ordinals', 'payment', 'stacks']</code> <br>Will default to <code>['ordinals', 'payment', 'stacks', 'spark','starknet']</code> if not specified.</p></td></tr><tr><td><code>message</code><br><span data-gb-custom-inline data-tag="emoji" data-code="2139">ℹ️</span> Optional</td><td>a custom message to show to the user during the connection request</td></tr><tr><td><code>network</code><br><span data-gb-custom-inline data-tag="emoji" data-code="2139">ℹ️</span> Optional</td><td><p>a string representing the network the wallet should use to connect to your app:</p><ul><li><code>Mainnet</code> for Bitcoin Mainnet | Spark Mainnet | Stacks Mainnet | Starknet Mainnet</li><li><code>Regtest</code> for Bitcoin Regtest | Spark Regtest | Stacks Testnet | Starknet Sepolia</li><li><code>Testnet</code> for Bitcoin Testnet | Spark Regtest | Stacks Testnet | Starknet Sepolia</li><li><code>Signet</code> for Bitcoin Signet | Spark Regtest | Stacks Testnet | Starknet Sepolia</li></ul><p><br>If the wallet is on a different network than the one you request, the user will be prompted to switch before connecting.</p></td></tr></tbody></table>

{% code fullWidth="false" %}

```typescript
import { request } from "sats-connect";

try {
  const response = await request('wallet_connect', null);
  if (response.status === 'success') {
    const paymentAddressItem = response.result.addresses.find(
      (address) => address.purpose === AddressPurpose.Payment
    );
    const ordinalsAddressItem = response.result.addresses.find(
      (address) => address.purpose === AddressPurpose.Ordinals
    );
    const stacksAddressItem = response.result.addresses.find(
        (address) => address.purpose === AddressPurpose.Stacks
    );
  } else {
    if (response.error.code === RpcErrorCode.USER_REJECTION) {
      // handle user cancellation error
    } else {
      // handle error
    }
  }
} catch (err) {
    alert(err.error.message);
}
```

{% endcode %}

## Connection request in your user's Xverse wallet&#x20;

If the user is not connected to your app yet, their Xverse wallet will display a *Connection Request* prompt with:

* your app url & your app logo (if it is specified in your app manifest)&#x20;
  * :soon: Note that if your app is referenced on [Xverse Explore](https://wallet.xverse.app/explore), Sats Connect will automatically display your app name & logo as they appear on Explore.
* the wallet addresses that your app required
* the message which you specified. Note that this message will be cut beyond 80 characters.
* the [permissions](https://docs.xverse.app/sats-connect/xverse-wallet-permissions) that your app is requesting from their wallet

The user can select which of their Xverse account they wish to connect to your app.

<figure><img src="https://content.gitbook.com/content/33DLypUqgcjkBSmN0gZn/blobs/IGwA5EfKbCw39NssY591/image.png" alt=""><figcaption></figcaption></figure>

:white\_check\_mark: If the user has already granted [permissions](https://docs.xverse.app/sats-connect/xverse-wallet-permissions), no connection request popup will appear, ensuring a smooth user experience.

## :white\_check\_mark: Successful Connection Request

The `wallet_connect` method returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that resolves once the user approves the connection request or if they are already connected to your app.&#x20;

Once resolved, the method returns `connectResult`: an array of the user’s wallet address objects, defined as:

```typescript
type address = {
    address: string;
    publicKey: string;
    purpose: "payment" | "ordinals" | "stacks" | "spark" | "starknet";
    addressType: "p2tr" | "p2wpkh" | "p2sh" | "stacks" | "spark" | "starknet";
}
```

You can use these addresses to make further requests such as [signing a message](https://docs.xverse.app/sats-connect/bitcoin-methods/signmessage), [signing a transaction](https://docs.xverse.app/sats-connect/bitcoin-methods/signpsbt), etc.

Currently, you can retrieve two types of Bitcoin addresses, the user's Bitcoin payment address and the Ordinals address which is a taproot address.

An example response:

{% code title="wallet\_connect response" %}

```typescript
const response = {
  walletType: 'software',
  id: 'dj0f7g5xtdakgecvf45dvssu66',
  addressses: [
    {
      address: 'tb1pzwa68q3udj0f7g5xtdakgecvf45dvssu66ry7y3at22w7vus20vq3sgw62',
      publicKey: 'b9907521ddb85e0e6a37622b7c685efbdc8ae53a334928adbd12cf204ad4e717',
      purpose: 'ordinals',
      addressType: 'p2tr',
      network: 'mainnet'
    },
    {
      address: '2NBfRKCUpafbatj5gV9T82uau3igdSf9BXJ',
      publicKey: '02818b7ff740a40f311d002123087053d5d9e0e1546674aedb10e15a5b57fd3985',
      purpose: 'payment',
      addressType: 'p2sh',
      network: 'mainnet'
    },
  ],
  network: {
    bitcoin: {
      name: 'Mainnet',
    },
    stacks: {
      name: 'Mainnet',
    },
  },
};
```

{% endcode %}

Where:

<table><thead><tr><th width="162">address field</th><th>Description</th></tr></thead><tbody><tr><td><code>address</code> </td><td>string - the user’s connected wallet address</td></tr><tr><td><code>publicKey</code></td><td>A hex string representing the bytes of the public key of the account. You can use this to construct partially signed Bitcoin transactions (PSBT).</td></tr><tr><td><code>purpose</code></td><td><p>string - The purpose of the address:</p><ul><li><code>ordinals</code> is preferably used to manage the user’s ordinals</li><li><code>payment</code> is preferably used to manage the user’s Bitcoin</li><li><code>stacks</code> is used to interact with the stacks ecosystem</li><li><code>spark</code> is used to interact with the Spark ecosystem</li><li><code>starknet</code> is used to interact with the Starknet ecosystem</li></ul></td></tr><tr><td><code>addressType</code></td><td><p>string - the address’s format:</p><ul><li><code>P2TR</code> for ordinals</li><li><code>P2SH</code> for payment</li><li><code>P2WPKH</code> for payment using Ledger</li><li><code>stacks</code> for Stacks</li><li><code>spark</code> for Spark</li><li><code>starknet</code> for Starknet</li></ul></td></tr><tr><td><code>network</code></td><td><p>string - the network where the address is being used:</p><ul><li><code>Mainnet</code> for Bitcoin Mainnet | Spark Mainnet | Stacks Mainnet | Starknet Mainnet</li><li><code>Regtest</code> for Bitcoin Regtest | Spark Regtest | Stacks Testnet | Starknet Sepolia</li><li><code>Testnet</code> for Bitcoin Testnet | Spark Regtest | Stacks Testnet | Starknet Sepolia</li><li><code>Signet</code> for Bitcoin Signet | Spark Regtest | Stacks Testnet | Starknet Sepolia</li></ul></td></tr><tr><td><code>walletType</code></td><td><p>string - the type of wallet used for the account</p><ul><li><code>ledger</code> if the user's account is using a Ledger device</li><li><code>software</code> otherwise</li></ul></td></tr></tbody></table>

After approving the connection request, the user can track the active connection with your app directly from their Xverse wallet, and [revoke the connection from the wallet.](https://docs.xverse.app/sats-connect/xverse-wallet-events)

<figure><img src="https://3630714736-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F33DLypUqgcjkBSmN0gZn%2Fuploads%2FFyaWpdmkJVHWj14NbjHv%2Fimage.png?alt=media&#x26;token=014bfcfe-3dda-45e7-845a-34fb4b41a560" alt=""><figcaption></figcaption></figure>

## :x: Unsuccessful Connection Request

If the user declines the connection request or closes the pop-up, the promise returned by the `connect` method will reject (throw when awaited).


# Disconnect from Xverse Wallet

[You can use `request("wallet_disconnect")`  to disconnect your app from the user's  wallet.](#user-content-fn-1)[^1]

This method clears the app's [permissions](https://docs.xverse.app/sats-connect/xverse-wallet-permissions) for all wallet accounts, effectively disconnecting the user.

Your app will then need to [connect to the user's account](https://docs.xverse.app/sats-connect/connecting-to-the-wallet) again to fetch account data.

[^1]: TBD if we add a wallet\_disconnect method [Eduard Bardají Puig](https://app.gitbook.com/u/7FXSPuUgMIVDB43EQ1PSB3GYhCy1 "mention")[Mahmoud Aboelenein](https://app.gitbook.com/u/EnsLtHq9yaXdMmE5DNbxJsnQUM22 "mention")

# wallet\_addNetwork

## Add a custom to the user's Xverse wallet&#x20;

The `wallet_addNetwork` method prompts the user to add a custom network to their Xverse Wallet.&#x20;

This method allows dApps to onboard users to a **custom network** (typically for **Regtest** or staging environments) without requiring manual wallet setup.

The app must have first [connected to the wallet](https://docs.xverse.app/sats-connect/connecting-to-the-wallet/connect-to-xverse-wallet) and obtained [account read permissions.](https://docs.xverse.app/sats-connect/xverse-wallet-permissions)&#x20;

{% hint style="info" %}
You can fetch the networks that the user's wallet is currently connected to, using [`wallet_getNetwork`](https://docs.xverse.app/sats-connect/wallet-methods/wallet_getnetwork).&#x20;
{% endhint %}

### Parameters

<table><thead><tr><th width="270">Request parameters</th><th>Description</th></tr></thead><tbody><tr><td><code>name</code></td><td>a string representing the user-visible network label (e.g. <code>"my-custom-regtest"</code>)</td></tr><tr><td><code>chain</code></td><td>Currently only <code>"bitcoin"</code> is supported, to add custom <a href="https://developer.bitcoin.org/examples/testing.html#regtest-mode">Regtest</a> networks</td></tr><tr><td><code>rpcUrl</code></td><td>a string representing the main RPC JSON-RPC endpoint for the added network</td></tr><tr><td><code>rpcFallbackUrl</code><br><span data-gb-custom-inline data-tag="emoji" data-code="2139">ℹ️</span> Optional</td><td>a string representing the fallback RPC URL if primary fails</td></tr><tr><td><code>indexerUrl</code><br><span data-gb-custom-inline data-tag="emoji" data-code="2139">ℹ️</span> Optional</td><td>a string representing the Indexer API used for advanced indexing of the balances and transaction history on the added network</td></tr><tr><td><code>blockExplorerUrl</code><br><span data-gb-custom-inline data-tag="emoji" data-code="2139">ℹ️</span> Optional</td><td>a string representing the transaction explorer base URL for the added network</td></tr></tbody></table>

```typescript
import Wallet from 'sats-connect';

async function example() {
  const res = await Wallet.request('wallet_addNetwork', {
   name: 'my-custom-regtest',
   chain: 'bitcoin',
   rpc_url: 'https://custom-regtest.tech/api/proxy',
   indexer_api: 'https://indexer.my-custom-regtest.app',
   block_explorer_url: 'https://mempool-my-custom-regtest.space',
   rpc_fallback_url: 'https://fallback.custom-regtest.tech/api/proxy' // optional
  });
  if (res.status === 'error') {
    console.error(res.error);
    return;
  }

  console.log(res.result);
}
```

## :white\_check\_mark: addNetwork Result&#x20;

The method will&#x20;

* prompt the user to add the custom network to their Xverse wallet![](https://3630714736-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F33DLypUqgcjkBSmN0gZn%2Fuploads%2FABBBCGcZVOBiItKWlMOc%2Fimage.png?alt=media\&token=8fdb43a9-214c-4c66-add0-8a6784bf7665)
* return `null` if the user accepts the prompt and adds the network -> **Null response**

The addition of the network to the wallet will emit a [networkAdded](https://docs.xverse.app/sats-connect/xverse-wallet-events#networkadded-event) event which your app can catch.

{% hint style="info" %}
Your app can then&#x20;

* prompt the user to switch their Xverse wallet to the newly added network with the [wallet\_changeNetwork](https://docs.xverse.app/sats-connect/wallet-methods/wallet_changenetwork)
* &#x20;fetch the user's active Xverse account under the new network with the [`wallet_getAccount`](https://docs.xverse.app/sats-connect/wallet-methods/wallet_getaccount) method.
  {% endhint %}
