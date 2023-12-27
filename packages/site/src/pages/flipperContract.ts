import { Signer as EthersSigner } from '@ethersproject/abstract-signer';
import { ethers } from 'ethers';
import { Signer as ReefVMSigner } from '@reef-chain/evm-provider';

export function getFlipperContract(signer: ReefVMSigner) {
  const flipperContractAddressTestnet =
    '0x6bECC47323fcD240F1c856ab3Aa4EFeC5ad63aFE';
  const FlipperAbi = [
    {
      inputs: [
        {
          internalType: 'bool',
          name: 'initvalue',
          type: 'bool',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'constructor',
    },
    {
      inputs: [],
      name: 'flip',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [],
      name: 'get',
      outputs: [
        {
          internalType: 'bool',
          name: '',
          type: 'bool',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
  ];
  return new ethers.Contract(
    flipperContractAddressTestnet,
    FlipperAbi,
    signer as EthersSigner,
  );
}

export async function flipIt(signer: ReefVMSigner) {
  const flipperContract = getFlipperContract(signer);
  return await flipperContract.flip();
}

export async function getFlipperValue(signer: ReefVMSigner) {
  const flipperContract = getFlipperContract(signer);
  return await flipperContract.get();
}
