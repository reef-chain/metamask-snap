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
import { flipIt, getFlipperValue } from '../utils/flipperContract';
import { buildMetadata, networkNameToGenesisHash } from '../utils/metadata';
import { Account, Network } from '../types/types';

const Index = () => {
  const [state, dispatch] = useContext(MetaMaskContext);
  const [newName, setNewName] = useState<string>();
  const [seedGenerate, setSeedGenerate] = useState<string>();
  const [seedImport, setSeedImport] = useState<string>();
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
    if (network) {
      updateProvider(network);
    } else {
      setNetwork(network);
      setProvider(undefined);
    }
  }, [network]);

  // Connection ///////////////////////////////////////////////////

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

  // Network //////////////////////////////////////////////////////

  const getNetwork = async (showAlert?: boolean) => {
    const _network: Network = await sendToSnap('getNetwork');
    setNetwork(_network);
    if (showAlert) {
      alert(`Network: ${_network.name}`);
    }
    return _network;
  };

  const switchNetwork = async () => {
    const _network = await sendToSnap('selectNetwork', {
      network: network?.name === 'testnet' ? 'mainnet' : 'testnet',
    });
    setNetwork(_network);
  };

  // Accounts /////////////////////////////////////////////////////

  const createSeed = async () => {
    try {
      const res = (await sendToSnap('createSeed')) as {
        address: string;
        seed: string;
      };
      setSeedGenerate(res.seed);
      console.log('Mnemonic:', res.seed);
      alert(`Mnemonic: ${res.seed}`);
    } catch (error) {
      console.error(error);
      dispatch({ type: MetamaskActions.SetError, payload: error });
    }
  };

  const createAccount = async (useSeedImport?: boolean) => {
    const seed = useSeedImport ? seedImport : seedGenerate;
    try {
      if (!seed) throw new Error('Invalid mnemonic');
      await sendToSnap('createAccountWithSeed', { seed, name: 'New Account' });
      getAccounts();
      alert('Account created');
    } catch (error) {
      console.error(error);
      dispatch({ type: MetamaskActions.SetError, payload: error });
    }
  };

  const renameAccount = async () => {
    try {
      if (!reefVmSigner) throw new Error('No account selected');
      if (!newName) throw new Error('New name not provided');
      await sendToSnap('renameAccount', {
        addressRename: reefVmSigner!._substrateAddress,
        newName: newName,
      });
      getAccounts();
      alert('Account renamed');
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
      json,
      password,
    });
    getAccounts();
    alert('Account imported');
  };

  const exportAccount = async (): Promise<void> => {
    if (!reefVmSigner) throw new Error('No account to delete');

    const address = reefVmSigner._substrateAddress;
    const password = 'password123';

    const json = await sendToSnap('exportAccount', {
      addressExport: address,
      passwordExport: password,
    });

    console.log('exportAccount:', json);
    alert(`Account exported: ${JSON.stringify(json)}`);
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

  const handleSelectAccount = async (event: any) => {
    await sendToSnap('selectAccount', {
      addressSelect: event.target.value,
    });
    getAccounts();
  };

  // Signing //////////////////////////////////////////////////////

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
      console.log('Flipper value:', res);
      alert(`Flipper value: ${res}`);
    } catch (e) {
      console.log(e);
    }
  };

  const getFlipValue = async () => {
    if (!reefVmSigner) throw new Error('Reef signer is required');
    try {
      const res = await getFlipperValue(reefVmSigner);
      console.log('Flipper value:', res);
      alert(`Flipper value: ${res}`);
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
      console.log('Messaged signed:', messageSigned);
      alert(`Message signed: ${messageSigned.signature}`);
    } catch (e) {
      console.log(e);
    }
  };

  // Metadata /////////////////////////////////////////////////////

  const getMetadata = async () => {
    if (!network) throw new Error('Network not found');
    const genesisHash = networkNameToGenesisHash[network.name];
    const res = await sendToSnap('getMetadata', { genesisHash });
    console.log(res);
    alert(`Metadata ${network.name}: ${JSON.stringify(res)}`);
  };

  const listMetadata = async () => {
    const res = await sendToSnap('listMetadata');
    console.log(res);
    alert(`Metadata: ${JSON.stringify(res)}`);
  };

  const updateMetadata = async () => {
    const _provider = provider || (await updateProvider(network));
    const metadata = buildMetadata(_provider.api);
    const res = await sendToSnap('provideMetadata', metadata);
    console.log(res);
    alert(`Metadata updated: ${JSON.stringify(res)}`);
  };

  // Test store ///////////////////////////////////////////////////

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
            title: 'Get network',
            description: 'Get selected network.',
            button: (
              <Button onClick={() => getNetwork(true)} disabled={!state.installedSnap}>
                Get network
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
            description: 'Create new Reef account from the mnemonic generated.',
            button: (
              <Button onClick={() => createAccount()} disabled={!state.installedSnap}>
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
            title: 'Rename account',
            description: 'Change name of the selected account.',
            input: (
              <input onChange={(event) => setNewName(event.target.value)} />
            ),
            button: (
              <Button onClick={renameAccount} disabled={!state.installedSnap}>
                Rename account
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
              <TextArea onChange={(event) => setSeedImport(event.target.value)} />
            ),
            button: (
              <Button
                onClick={() => createAccount(true)}
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
            title: 'Export account to JSON',
            button: (
              <Button
                onClick={() => exportAccount()}
                disabled={!state.installedSnap}
              >
                Export account
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
            title: 'Get metadata',
            description: 'Get metadata definition for selected network stored in snap.',
            button: (
              <Button
                onClick={() => getMetadata()}
                disabled={!state.installedSnap}
              >
                Get metadata
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
        {/* <Card
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
        /> */}
      </CardContainer>
    </Container>
  );
};

export default Index;
