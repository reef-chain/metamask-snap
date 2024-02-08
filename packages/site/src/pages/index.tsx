import { useContext, useEffect, useState } from 'react';

import { WsProvider } from '@polkadot/api';
import { Provider, Signer as ReefVMSigner } from '@reef-chain/evm-provider';

import Signer from './Signer';
import {
  ConnectButton,
  InstallFlaskButton,
  ReconnectButton,
  Card,
  Button,
  TextArea,
  Toggle,
  Container,
  Heading,
  Span,
  Subtitle,
  SelectInput,
  Option,
  CardContainer,
  ErrorMessage,
} from '../components';
import { defaultSnapOrigin } from '../config';
import { MetamaskActions, MetaMaskContext } from '../hooks';
import {
  connectSnap,
  getSnap,
  isLocalSnap,
  sendToSnap,
  shouldDisplayReconnectButton,
} from '../utils';
import { flipIt, getFlipperValue } from './flipperContract';
import { getMetadata } from '../utils/metadata';
import { Account, Network } from './types';

const Index = () => {
  const [state, dispatch] = useContext(MetaMaskContext);
  const [seed, setSeed] = useState<string>();
  const [reefVmSigner, setReefVmSigner] = useState<ReefVMSigner>();
  const [provider, setProvider] = useState<Provider>();
  const [network, setNetwork] = useState<Network>();
  const [isDefaultExt, setIsDefaultExt] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const isMetaMaskReady = isLocalSnap(defaultSnapOrigin)
    ? state.isFlask
    : state.snapsDetected;

  useEffect(() => {
    if (state.installedSnap) {
      getNetwork();
      getAccounts();
      getIsDefaultExt();
    }
  }, [state.installedSnap]);

  useEffect(() => {
    updateProvider(network);
  }, [network]);

  const connect = async () => {
    try {
      await connectSnap();
      const installedSnap = await getSnap();

      dispatch({
        type: MetamaskActions.SetInstalled,
        payload: installedSnap,
      });
    } catch (error) {
      console.error(error);
      dispatch({ type: MetamaskActions.SetError, payload: error });
    }
  };

  const getAccounts = async () => {
    try {
      const _accounts = await sendToSnap('listAccounts');
      const _selectedAccount = _accounts.find((acc: Account) => acc.isSelected);
      setAccounts(_accounts);
      buildReefSigner(_selectedAccount?.address);
      console.log('accounts:', _accounts);
    } catch (error) {
      console.error(error);
      dispatch({ type: MetamaskActions.SetError, payload: error });
    }
  };

  const createSeed = async () => {
    try {
      const res = (await sendToSnap('createSeed')) as {
        address: string;
        seed: string;
      };
      setSeed(res.seed);
      console.log('seed:', res.seed);
    } catch (error) {
      console.error(error);
      dispatch({ type: MetamaskActions.SetError, payload: error });
    }
  };

  const createAccount = async () => {
    try {
      if (!seed) throw new Error('Seed is required');
      await sendToSnap('createAccountWithSeed', { seed, name: 'New Account' });
      getAccounts();
    } catch (error) {
      console.error(error);
      dispatch({ type: MetamaskActions.SetError, payload: error });
    }
  };

  const deleteAccount = async () => {
    try {
      if (!reefVmSigner) throw new Error('No account to delete');
      const res = await sendToSnap('forgetAccount', {
        addressForget: reefVmSigner!._substrateAddress,
      });
      console.log('forgetAccount:', res);
      getAccounts();
    } catch (error) {
      console.error(error);
      dispatch({ type: MetamaskActions.SetError, payload: error });
    }
  };

  const importAccountFromJson = async () => {
    const json = {
      encoded:
        '8bXBJheySjlbHuxAJ7bDr3T32ciHnkZu9bjP3oNha3EAgAAAAQAAAAgAAAA0cejGUbxIo55KuQTuD/CSBk2Or2sbfp1gamdfanRBB8ysNa4GQxRGi+GI6yTbBCaqI3oAUuBRf11XpQWgVibV+OPSONABmtKEHRdrhTB5rwsQwVG1LcP8Q/nlgZ9Fs87gd21ZcyIA7MjCj9KMPmUeqgRr18CrBpO0vGL/oHWcC8TbdUZ+lk4V3Ksw7F4esIXB/VNuLOcyx2DrRSmK',
      encoding: {
        content: ['pkcs8', 'sr25519'],
        type: ['scrypt', 'xsalsa20-poly1305'],
        version: '3',
      },
      address: '5CiQSTanh84sGgN6PL5WGmFYtEEBsgxVUp5Tmu5p1Zxjbrxw',
      meta: { genesisHash: '', name: 'mock1', whenCreated: 1707381299466 },
    };

    const password = 'mock1pass';

    await sendToSnap('importAccount', {
      file: json,
      password: password,
    });
    getAccounts();
  };

  const importAccountsFromJson = async () => {
    const json = {
      encoded:
        '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',
      encoding: {
        content: ['batch-pkcs8'],
        type: ['scrypt', 'xsalsa20-poly1305'],
        version: '3',
      },
      accounts: [
        {
          address: '5CiQSTanh84sGgN6PL5WGmFYtEEBsgxVUp5Tmu5p1Zxjbrxw',
          meta: { genesisHash: '', name: 'mock1', whenCreated: 1707381299466 },
        },
        {
          address: '5EqfJvfeST22TMvRzFLrnN3b29NuVCfW5rbXmqNGDYvBrz2v',
          meta: { genesisHash: '', name: 'mock2', whenCreated: 1707381325392 },
        },
        {
          address: '5EA7s77Aa6FAZGJrHVngiDP8NwGUK8593DVWdR5ULEpPWseP',
          meta: { genesisHash: '', name: 'mock3', whenCreated: 1707381349734 },
        },
      ],
    };

    const password = 'mockbatch';

    await sendToSnap('importAccounts', {
      file: json,
      password: password,
    });
    getAccounts();
  };

  const buildReefSigner = async (address: string) => {
    if (!address) {
      setReefVmSigner(undefined);
      return;
    }
    const _provider = provider || (await updateProvider(network));
    const signer = new Signer();
    const newReefVmSigner = new ReefVMSigner(_provider, address, signer);
    setReefVmSigner(newReefVmSigner);
  };

  const flipValue = async () => {
    try {
      if (!reefVmSigner) throw new Error('Reef signer is required');
      await flipIt(reefVmSigner);
      const res = await getFlipperValue(reefVmSigner);
      console.log('flipper value:', res);
    } catch (e) {
      console.log(e);
    }
  };

  const getFlipValue = async () => {
    if (!reefVmSigner) throw new Error('Reef signer is required');
    try {
      const res = await getFlipperValue(reefVmSigner);
      console.log('flipper value:', res);
    } catch (e) {
      console.log(e);
    }
  };

  const signBytes = async () => {
    try {
      if (!reefVmSigner) throw new Error('Reef signer is required');
      const messageSigned = await reefVmSigner.signingKey.signRaw!({
        address: reefVmSigner._substrateAddress,
        data: 'hello world',
        type: 'bytes',
      });
      console.log('messaged signed:', messageSigned);
    } catch (e) {
      console.log(e);
    }
  };

  const listMetadata = async () => {
    const res = await sendToSnap('listMetadata');
    console.log(res);
  };

  const updateMetadata = async () => {
    const _provider = provider || (await updateProvider(network));
    const metadata = getMetadata(_provider.api);
    const res = await sendToSnap('provideMetadata', metadata);
    console.log(res);
  };

  const getNetwork = async () => {
    const _network: Network = await sendToSnap('getNetwork');
    setNetwork(_network);
    return _network;
  };

  const switchNetwork = async () => {
    const _network = await sendToSnap('selectNetwork', {
      network: network?.name === 'testnet' ? 'mainnet' : 'testnet',
    });
    setNetwork(_network);
  };

  const getIsDefaultExt = async () => {
    const _isDefaultExt = await sendToSnap('isDefaultExtension');
    setIsDefaultExt(_isDefaultExt);
  };

  const switchIsDefaultExt = async () => {
    const _isDefaultExt = await sendToSnap('setAsDefaultExtension', {
      isDefault: !isDefaultExt,
    });
    setIsDefaultExt(_isDefaultExt);
  };

  const updateProvider = async (network?: Network) => {
    let _network = network;
    if (!_network) {
      _network = await getNetwork();
      setNetwork(_network);
    }

    const _provider = new Provider({
      provider: new WsProvider(_network.rpcUrl),
    });

    try {
      await _provider.api.isReadyOrError;
    } catch (e) {
      console.error('Provider isReadyOrError', e);
      throw e;
    }

    setProvider(_provider);
    return _provider;
  };

  const handleSelectAccount = async (event: any) => {
    await sendToSnap('selectAccount', {
      addressSelect: event.target.value,
    });
    getAccounts();
  };

  const getAllStores = async () => {
    const res = await sendToSnap('getAllStores');
    console.log(res);
  };

  const clearAllStores = async () => {
    const res = await sendToSnap('clearAllStores');
    console.log(res);
  };

  return (
    <Container>
      <Heading>
        <Span>Reef Chain snap</Span>
      </Heading>
      <Subtitle>
        {state.installedSnap && <div>Network: {network?.name || '-'}</div>}
        {network?.name && (
          <Toggle
            onToggle={switchNetwork}
            defaultChecked={network?.name === 'mainnet'}
          />
        )}
        {state.installedSnap && (
          <>
            <div>Default extension: {isDefaultExt ? ' ✅' : ' ❌'}</div>
            <Toggle
              onToggle={switchIsDefaultExt}
              defaultChecked={isDefaultExt}
            />
          </>
        )}
      </Subtitle>
      {accounts.length > 0 && (
        <Subtitle>
          <SelectInput
            value={reefVmSigner?._substrateAddress}
            onChange={handleSelectAccount}
          >
            <Option value="">Select account...</Option>
            {accounts.map((account, index) => (
              <Option key={index} value={account.address}>
                {account.address} - {account.name}
                {account.isSelected ? ' ✅' : ''}
              </Option>
            ))}
          </SelectInput>
          <Button onClick={() => deleteAccount()}>Delete account</Button>
        </Subtitle>
      )}
      <CardContainer>
        {state.error && (
          <ErrorMessage>
            <b>An error happened:</b> {state.error.message}
          </ErrorMessage>
        )}
        {!isMetaMaskReady && (
          <Card
            content={{
              title: 'Install',
              description:
                'Snaps is pre-release software only available in MetaMask Flask, a canary distribution for developers with access to upcoming features.',
              button: <InstallFlaskButton />,
            }}
            fullWidth
          />
        )}
        {!state.installedSnap && (
          <Card
            content={{
              title: 'Connect',
              description:
                'Get started by connecting to and installing the example snap.',
              button: (
                <ConnectButton onClick={connect} disabled={!isMetaMaskReady} />
              ),
            }}
            disabled={!isMetaMaskReady}
          />
        )}
        {shouldDisplayReconnectButton(state.installedSnap) && (
          <Card
            content={{
              title: 'Reconnect',
              description:
                'While connected to a local running snap this button will always be displayed in order to update the snap if a change is made.',
              button: (
                <ReconnectButton
                  onClick={connect}
                  disabled={!state.installedSnap}
                />
              ),
            }}
            disabled={!state.installedSnap}
          />
        )}
        <Card
          content={{
            title: 'Create mnemonic',
            description: 'Generate a mnemonic for a new Reef account.',
            button: (
              <Button onClick={createSeed} disabled={!state.installedSnap}>
                Create mnemonic
              </Button>
            ),
          }}
          disabled={!state.installedSnap}
          fullWidth={
            isMetaMaskReady &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        />
        <Card
          content={{
            title: 'Create account',
            description: 'Create new Reef account from mnemonic.',
            button: (
              <Button onClick={createAccount} disabled={!state.installedSnap}>
                Create account
              </Button>
            ),
          }}
          disabled={!state.installedSnap}
          fullWidth={
            isMetaMaskReady &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        />
        <Card
          content={{
            title: 'Import from mnemonic',
            description: 'Import existing account from mnemonic.',
            input: (
              <TextArea onChange={(event) => setSeed(event.target.value)} />
            ),
            button: (
              <Button
                onClick={() => createAccount()}
                disabled={!state.installedSnap}
              >
                Import account
              </Button>
            ),
          }}
          disabled={!state.installedSnap}
          fullWidth={
            isMetaMaskReady &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        />
        <Card
          content={{
            title: 'Import account from JSON',
            button: (
              <Button
                onClick={() => importAccountFromJson()}
                disabled={!state.installedSnap}
              >
                Import account
              </Button>
            ),
          }}
          disabled={!state.installedSnap}
          fullWidth={
            isMetaMaskReady &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        />
        <Card
          content={{
            title: 'Import multiple accounts from JSON',
            button: (
              <Button
                onClick={() => importAccountsFromJson()}
                disabled={!state.installedSnap}
              >
                Import batch
              </Button>
            ),
          }}
          disabled={!state.installedSnap}
          fullWidth={
            isMetaMaskReady &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        />
        <Card
          content={{
            title: 'Flip',
            description: 'Switch flipper value.',
            button: (
              <Button
                onClick={() => flipValue()}
                disabled={!state.installedSnap}
              >
                Flip it!
              </Button>
            ),
          }}
          disabled={!state.installedSnap}
          fullWidth={
            isMetaMaskReady &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        />
        <Card
          content={{
            title: 'Get flipper value',
            description: 'Get the value of the flipper.',
            button: (
              <Button
                onClick={() => getFlipValue()}
                disabled={!state.installedSnap}
              >
                Get flipper value
              </Button>
            ),
          }}
          disabled={!state.installedSnap}
          fullWidth={
            isMetaMaskReady &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        />
        <Card
          content={{
            title: 'Sign bytes',
            description: 'Sign raw message.',
            button: (
              <Button
                onClick={() => signBytes()}
                disabled={!state.installedSnap}
              >
                Sign bytes
              </Button>
            ),
          }}
          disabled={!state.installedSnap}
          fullWidth={
            isMetaMaskReady &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        />
        <Card
          content={{
            title: 'List metadata',
            description: 'List all metadata definitions stored in snap.',
            button: (
              <Button
                onClick={() => listMetadata()}
                disabled={!state.installedSnap}
              >
                List metadata
              </Button>
            ),
          }}
          disabled={!state.installedSnap}
          fullWidth={
            isMetaMaskReady &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        />
        <Card
          content={{
            title: 'Update metadata',
            description:
              'Update to the latest metadata version on the selected network.',
            button: (
              <Button
                onClick={() => updateMetadata()}
                disabled={!state.installedSnap}
              >
                Update metadata
              </Button>
            ),
          }}
          disabled={!state.installedSnap}
          fullWidth={
            isMetaMaskReady &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        />
        <Card
          content={{
            title: 'Get all data from store',
            button: (
              <Button
                onClick={() => getAllStores()}
                disabled={!state.installedSnap}
              >
                Get all stores
              </Button>
            ),
          }}
          disabled={!state.installedSnap}
          fullWidth={
            isMetaMaskReady &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        />
        <Card
          content={{
            title: 'Remove all data from store',
            button: (
              <Button
                onClick={() => clearAllStores()}
                disabled={!state.installedSnap}
              >
                Remove all stores
              </Button>
            ),
          }}
          disabled={!state.installedSnap}
          fullWidth={
            isMetaMaskReady &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        />
      </CardContainer>
    </Container>
  );
};

export default Index;
