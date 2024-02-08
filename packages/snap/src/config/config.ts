import { NetworkName } from './networks';

interface Config {
  dappUrl: string;
  defaultNetwork: NetworkName;
}

export const config: Config = {
  dappUrl: 'app.reef.io/snap',
  defaultNetwork: 'testnet', // TODO: switch to mainnet
};
