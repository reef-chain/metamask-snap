# Reef Chain Wallet Snap

The Reef Chain Wallet Snap allows users to interact with the Reef Chain using MetaMask.

## API

The Reef Chain Wallet Snap provides a set of custom end-points that can be accessed with the [`wallet_invokeSnap`](https://docs.metamask.io/wallet/reference/wallet_invokesnap/) MetaMask method.

Example of use:

```js
await window.ethereum.request({
  "method": "wallet_invokeSnap",
  "params": [
    {
      "snapId": "npm:@reef-chain/reef-snap",
      "request": {
        "method": "selectNetwork",
        "params": {
          "network": "mainnet"
        }
      }
    }
  ]
});
```

| Method | Params | Returns | Description |
| --- | --- | --- | --- |
| getNetwork | | { network: string, rpcUrl: string } | Returns the current network. |
| selectNetwork | { network: string } | { name: string, rpcUrl: string } | Selects the network to use. |
| createSeed | | { address: string, seed: string } | Generates a 12-word mnemonic and its associated Reef native address. |
| createAccountWithSeed | { seed: string, name: string } | { address: string } | Creates a Reef account from a 12-word mnemonic. |
| renameAccount | { addressRename: string, name: string } | boolean | Renames an account. |
| importAccount | { json: string, password: string } | boolean | Imports an account from a backup JSON file. |
| exportAccount | { addressExport: string, passwordExport: string } | JSON | Exports an account to a backup JSON file. |
| forgetAccount | { addressForget: string } | boolean | Removes an account from the wallet. |
| listAccounts | | { address: string, name: string, isSelected: boolean }[] | Lists all accounts in the wallet. |
| selectAccount | { addressSelect: string } | boolean | Selects an account to use. |
| requestSignature | SignerPayloadJSON \| SignerPayloadRaw | { signature: string } | Requests a signature for a transaction or a raw message. This method is meant to be called by the signer implementation. |
| getMetadata | { genesisHash: string} | MetadataDef | Returns the metadata of a network. |
| listMetadata | | MetadataDef[] | Lists all available metadata definitions. |
| provideMetadata | MetadataDef | boolean | Provides a metadata definition. |


## Development

This project has been created from the [MetaMask template-snap-monorepo](@metamask/template-snap-monorepo) repository.

For more information about Snap development see [the MetaMask documentation](https://docs.metamask.io/guide/snaps.html#serving-a-snap-to-your-local-environment).

### Getting Started

Set up the development environment:

```shell
yarn install && yarn start
```