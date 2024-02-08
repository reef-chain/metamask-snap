export type NetworkName = 'mainnet' | 'testnet' | 'localhost';

export interface Network {
  name: NetworkName;
  displayName: string;
  genesisHash: string;
  rpcUrl: string;
  reefscanUrl: string;
}

export const availableNetworks: Record<NetworkName, Network> = {
  testnet: {
    name: 'testnet',
    displayName: 'Reef Scuba (Testnet)',
    genesisHash:
      '0xb414a8602b2251fa538d38a9322391500bd0324bc7ac6048845d57c37dd83fe6',
    rpcUrl: 'wss://rpc-testnet.reefscan.com/ws',
    reefscanUrl: 'https://testnet.reefscan.com',
  },
  mainnet: {
    name: 'mainnet',
    displayName: 'Reef Mainnet',
    genesisHash:
      '0x7834781d38e4798d548e34ec947d19deea29df148a7bf32484b7b24dacf8d4b7',
    rpcUrl: 'wss://rpc.reefscan.com/ws',
    reefscanUrl: 'https://reefscan.com',
  },
  localhost: {
    name: 'localhost',
    displayName: 'Local Node',
    genesisHash: '',
    rpcUrl: 'ws://localhost:9944',
    reefscanUrl: 'http://localhost:8000',
  },
};
