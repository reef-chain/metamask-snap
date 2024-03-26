import { NetworkName } from './networks';

interface Config {
  dappUrl: string;
  defaultNetwork: NetworkName;
  debug: boolean;
}

export const config: Config = {
  dappUrl: 'app.reef.io/snap',
  defaultNetwork: 'mainnet',
  debug: process.env.NODE_ENV === 'development',
};
