import { useContext, useState } from 'react';
import styled from 'styled-components';

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
} from '../components';
import { defaultSnapOrigin } from '../config';
import { MetamaskActions, MetaMaskContext } from '../hooks';
import {
  connectSnap,
  getSnap,
  isLocalSnap,
  sendCreateAccountWithSeed,
  sendCreateSeed,
  sendForgetAccount,
  sendGetProviderUrl,
  sendImportAccountsFromJson,
  sendListAccounts,
  sendToSnap,
  shouldDisplayReconnectButton,
} from '../utils';
import { flipIt, getFlipperValue } from './flipperContract';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  margin-top: 7.6rem;
  margin-bottom: 7.6rem;
  ${({ theme }) => theme.mediaQueries.small} {
    padding-left: 2.4rem;
    padding-right: 2.4rem;
    margin-top: 2rem;
    margin-bottom: 2rem;
    width: auto;
  }
`;

const Heading = styled.h1`
  margin-top: 0;
  margin-bottom: 2.4rem;
  text-align: center;
`;

const Span = styled.span`
  color: ${(props) => props.theme.colors.primary?.default};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.large};
  font-weight: 500;
  margin-top: 0;
  margin-bottom: 0;
  ${({ theme }) => theme.mediaQueries.small} {
    font-size: ${({ theme }) => theme.fontSizes.text};
  }
`;

const CardContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  max-width: 64.8rem;
  width: 100%;
  height: 100%;
  margin-top: 1.5rem;
`;

const ErrorMessage = styled.div`
  background-color: ${({ theme }) => theme.colors.error?.muted};
  border: 1px solid ${({ theme }) => theme.colors.error?.default};
  color: ${({ theme }) => theme.colors.error?.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-bottom: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;
  ${({ theme }) => theme.mediaQueries.small} {
    padding: 1.6rem;
    margin-bottom: 1.2rem;
    margin-top: 1.2rem;
    max-width: 100%;
  }
`;

const Index = () => {
  const [state, dispatch] = useContext(MetaMaskContext);
  const [seed, setSeed] = useState<string>();
  const [addressDelete, setAddressDelete] = useState<string>();
  const [reefVmSigner, setReefVmSigner] = useState<ReefVMSigner>();

  const isMetaMaskReady = isLocalSnap(defaultSnapOrigin)
    ? state.isFlask
    : state.snapsDetected;

  const handleConnectClick = async () => {
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

  const handleListAccountClick = async () => {
    try {
      const accounts = await sendListAccounts();
      console.log(accounts);
    } catch (error) {
      console.error(error);
      dispatch({ type: MetamaskActions.SetError, payload: error });
    }
  };

  const handleCreateSeedClick = async () => {
    try {
      const res = (await sendCreateSeed()) as { address: string; seed: string };
      console.log(res);
      setSeed(res.seed);
    } catch (error) {
      console.error(error);
      dispatch({ type: MetamaskActions.SetError, payload: error });
    }
  };

  const handleCreateAccountClick = async () => {
    if (!seed) throw new Error('Seed is required');
    try {
      const createdAddress = await sendCreateAccountWithSeed(
        seed,
        'New Account',
      );
      console.log(createdAddress);
      buildReefSigner(createdAddress as string);
    } catch (error) {
      console.error(error);
      dispatch({ type: MetamaskActions.SetError, payload: error });
    }
  };

  const handleDeleteAccountClick = async () => {
    if (!addressDelete) throw new Error('No account to delete');
    try {
      await sendForgetAccount(addressDelete);
      console.log('Account deleted');
    } catch (error) {
      console.error(error);
      dispatch({ type: MetamaskActions.SetError, payload: error });
    }
  };

  const handleImportMnemonicClick = async () => {
    try {
      const importAddress = await sendCreateAccountWithSeed(
        'reef reef reef reef reef reef reef reef reef reef reef reef',
        'Imported Account',
      );
      console.log(importAddress);
      buildReefSigner(importAddress as string);
    } catch (error) {
      console.error(error);
      dispatch({ type: MetamaskActions.SetError, payload: error });
    }
  };

  const handleImportAccountsFromJsonClick = async () => {
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

    await sendImportAccountsFromJson(json, password);
  };

  const buildReefSigner = async (address: string) => {
    const providerUrl = await sendGetProviderUrl();
    if (!providerUrl) throw new Error('Provider URL is required');

    const provider = new Provider({
      provider: new WsProvider(providerUrl as string),
    });
    try {
      await provider.api.isReadyOrError;
    } catch (e) {
      console.log('Provider isReadyOrError ERROR=', e);
      throw e;
    }
    const signer = new Signer();
    const newReefVmSigner = new ReefVMSigner(provider, address, signer);
    setReefVmSigner(newReefVmSigner);
  };

  const handleFlipItClick = async () => {
    if (!reefVmSigner) throw new Error('Reef signer is required');
    try {
      var ctrRes = await flipIt(reefVmSigner);
      console.log('flipped=', ctrRes);
      getFlipperValue(reefVmSigner);
    } catch (e) {
      console.log(e);
    }
  };

  const handleGetFlipValueClick = async () => {
    if (!reefVmSigner) throw new Error('Reef signer is required');
    try {
      var ctrRes = await getFlipperValue(reefVmSigner);
      console.log('flipper value=', ctrRes);
    } catch (e) {
      console.log(e);
    }
  };

  const handleSignBytesClick = async () => {
    if (!reefVmSigner) throw new Error('Reef signer is required');
    try {
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

  const handleSetStoreClick = async () => {
    const res = await sendToSnap('setStore', {
      address: seed || 'test',
    });
    console.log(res);
  };

  const handleGetStoreClick = async () => {
    const res = await sendToSnap('getStore', {
      address: seed || 'test',
    });
    console.log(res);
  };

  const handleGetAllStoresClick = async () => {
    const res = await sendToSnap('getAllStores');
    console.log(res);
  };

  const handleRemoveStoreClick = async () => {
    const res = await sendToSnap('removeStore', {
      address: seed || 'test',
    });
    console.log(res);
  };

  const handleClearStoresClick = async () => {
    const res = await sendToSnap('clearAllStores');
    console.log(res);
  };

  return (
    <Container>
      <Heading>
        <Span>Reef Chain snap</Span>
      </Heading>
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
                <ConnectButton
                  onClick={handleConnectClick}
                  disabled={!isMetaMaskReady}
                />
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
                  onClick={handleConnectClick}
                  disabled={!state.installedSnap}
                />
              ),
            }}
            disabled={!state.installedSnap}
          />
        )}
        <Card
          content={{
            title: 'List accounts',
            description: 'Get list of accounts.',
            button: (
              <Button
                onClick={() => handleListAccountClick()}
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
        />
        <Card
          content={{
            title: 'Create mnemonic',
            description: 'Generate a mnemonic for a new Reef account.',
            button: (
              <Button
                onClick={handleCreateSeedClick}
                disabled={!state.installedSnap}
              >
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
              <Button
                onClick={handleCreateAccountClick}
                disabled={!state.installedSnap}
              >
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
                onClick={() => handleCreateAccountClick()}
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
                onClick={() => handleDeleteAccountClick()}
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
                onClick={() => handleImportAccountsFromJsonClick()}
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
                onClick={() => handleFlipItClick()}
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
                onClick={() => handleGetFlipValueClick()}
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
                onClick={() => handleSignBytesClick()}
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
                onClick={() => handleSetStoreClick()}
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
                onClick={() => handleGetStoreClick()}
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
            title: 'Get all stores',
            description: 'Get all stores.',
            button: (
              <Button
                onClick={() => handleGetAllStoresClick()}
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
            title: 'Remove store',
            description: 'Remove store value.',
            button: (
              <Button
                onClick={() => handleRemoveStoreClick()}
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
                onClick={() => handleClearStoresClick()}
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
      </CardContainer>
    </Container>
  );
};

export default Index;
