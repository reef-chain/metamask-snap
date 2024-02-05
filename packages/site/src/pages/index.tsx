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
  const [addressDelete, setAddressDelete] = useState<string>();
  const [reefVmSigner, setReefVmSigner] = useState<ReefVMSigner>();
  const [provider, setProvider] = useState<Provider>();
  const [network, setNetwork] = useState<Network>();
  const [accounts, setAccounts] = useState<Account[]>([]);

  const isMetaMaskReady = isLocalSnap(defaultSnapOrigin)
    ? state.isFlask
    : state.snapsDetected;

  useEffect(() => {
    if (state.installedSnap) {
      getNetwork();
      getAccounts();
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
      if (!addressDelete) throw new Error('No account to delete');
      await sendToSnap('forgetAccount', {
        address: addressDelete,
      });
      console.log('Account deleted');
      getAccounts();
    } catch (error) {
      console.error(error);
      dispatch({ type: MetamaskActions.SetError, payload: error });
    }
  };

  const importAccountsFromJson = async () => {
    const json = {
      encoded:
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      encoding: {
        content: ['batch-pkcs8'],
        type: ['scrypt', 'xsalsa20-poly1305'],
        version: '3',
      },
      accounts: [
        {
          address: '5C4umxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          meta: {
            _isSelectedTs: 1687958250560,
            genesisHash: '',
            name: 'Reef-1',
            whenCreated: 1658132263282,
          },
        },
        {
          address: '5CqNxQxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          meta: {
            _isSelectedTs: 1691135429767,
            genesisHash: '',
            name: 'Reef-2',
            whenCreated: 1658132183325,
          },
        },
      ],
    };
    const password = 'my_password';

    await sendToSnap('importAccounts', {
      file: json,
      password: password,
    });
    getAccounts();
  };

  const buildReefSigner = async (address: string) => {
    const _provider = provider || (await updateProvider(network));
    const signer = new Signer();
    const newReefVmSigner = new ReefVMSigner(_provider, address, signer);
    setReefVmSigner(newReefVmSigner);
  };

  const flipValue = async () => {
    try {
      if (!reefVmSigner) throw new Error('Reef signer is required');
      await flipIt(reefVmSigner);
      const res = getFlipperValue(reefVmSigner);
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

  const setStore = async () => {
    const res = await sendToSnap('setStore', {
      address: seed || 'test',
    });
    console.log(res);
  };

  const getStore = async () => {
    const res = await sendToSnap('getStore', {
      address: seed || 'test',
    });
    console.log(res);
  };

  const getAllAccounts = async () => {
    const res = await sendToSnap('getAllAccounts');
    console.log(res);
  };

  const getAllMetadata = async () => {
    const res = await sendToSnap('getAllMetadatas');
    console.log(res);
  };

  const removeStore = async () => {
    const res = await sendToSnap('removeStore', {
      address: seed || 'test',
    });
    console.log(res);
  };

  const clearStores = async () => {
    const res = await sendToSnap('clearAllStores');
    console.log(res);
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
      </Subtitle>
      {accounts.length > 0 && (
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
        {/* <Card
          content={{
            title: 'Init keyring',
            button: (
              <Button
                onClick={() => sendToSnap('initKeyring')}
                disabled={!state.installedSnap}
              >
                Init keyring
              </Button>
            ),
          }}
          disabled={!state.installedSnap}
          fullWidth={
            isMetaMaskReady &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        /> */}
        {/* <Card
          content={{
            title: 'List accounts',
            description: 'Get list of accounts.',
            button: (
              <Button
                onClick={() => getAccounts()}
                disabled={!state.installedSnap}
              >
                List accounts
              </Button>
            ),
          }}
          disabled={!state.installedSnap}
          fullWidth={
            isMetaMaskReady &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        /> */}
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
            title: 'Delete account',
            input: (
              <TextArea
                onChange={(event) => setAddressDelete(event.target.value)}
              />
            ),
            button: (
              <Button
                onClick={() => deleteAccount()}
                disabled={!state.installedSnap}
              >
                Delete account
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
        {/* <Card
          content={{
            title: 'Import from JSON',
            description: 'Import accounts from JSON file.',
            button: (
              <Button
                onClick={() => importAccountsFromJson()}
                disabled={!state.installedSnap}
              >
                Import accounts
              </Button>
            ),
          }}
          disabled={!state.installedSnap}
          fullWidth={
            isMetaMaskReady &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        /> */}
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
            title: 'Set store',
            description: 'Set store value.',
            button: (
              <Button
                onClick={() => setStore()}
                disabled={!state.installedSnap}
              >
                Set store
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
            title: 'Get store',
            description: 'Get store value.',
            button: (
              <Button
                onClick={() => getStore()}
                disabled={!state.installedSnap}
              >
                Get store
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
            title: 'Get all accounts from store',
            button: (
              <Button
                onClick={() => getAllAccounts()}
                disabled={!state.installedSnap}
              >
                Get accounts
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
            title: 'Get metadatas from store',
            button: (
              <Button
                onClick={() => getAllMetadata()}
                disabled={!state.installedSnap}
              >
                Get metadatas
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
            title: 'Remove store',
            description: 'Remove store value.',
            button: (
              <Button
                onClick={() => removeStore()}
                disabled={!state.installedSnap}
              >
                Remove store
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
            title: 'Clear stores',
            description: 'Clear all stores.',
            button: (
              <Button
                onClick={() => clearStores()}
                disabled={!state.installedSnap}
              >
                Clear stores
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
      </CardContainer>
    </Container>
  );
};

export default Index;
