export const ENCRYPTED_PAYROLL_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "HookNotAllowlisted",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidEmployee",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidRate",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotAuthorized",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotEmployer",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "StreamAlreadyExists",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "StreamNotCancelable",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "StreamNotFound",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousAdmin",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newAdmin",
        "type": "address"
      }
    ],
    "name": "AdminTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "hook",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "allowed",
        "type": "bool"
      }
    ],
    "name": "HookAllowed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      }
    ],
    "name": "StreamCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "cancelable",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "transferable",
        "type": "bool"
      }
    ],
    "name": "StreamConfigured",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "streamId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "employer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "employee",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "rateHandle",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "cadenceInSeconds",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "startTime",
        "type": "uint64"
      }
    ],
    "name": "StreamCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousHook",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newHook",
        "type": "address"
      }
    ],
    "name": "StreamHookUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      }
    ],
    "name": "StreamPaused",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      }
    ],
    "name": "StreamResumed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      }
    ],
    "name": "StreamSettled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "amountHandle",
        "type": "bytes32"
      }
    ],
    "name": "StreamToppedUp",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "streamId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "amountHandle",
        "type": "bytes32"
      }
    ],
    "name": "StreamWithdrawn",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "admin",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "hook",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "allowed",
        "type": "bool"
      }
    ],
    "name": "allowHook",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      }
    ],
    "name": "cancelStream",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "employer",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "employee",
        "type": "address"
      }
    ],
    "name": "computeStreamId",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      },
      {
        "internalType": "bool",
        "name": "cancelable",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "transferable",
        "type": "bool"
      }
    ],
    "name": "configureStream",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "employee",
        "type": "address"
      },
      {
        "internalType": "externalEuint64",
        "name": "encRatePerSecond",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "rateProof",
        "type": "bytes"
      },
      {
        "internalType": "uint32",
        "name": "cadenceInSeconds",
        "type": "uint32"
      },
      {
        "internalType": "uint64",
        "name": "startTime",
        "type": "uint64"
      }
    ],
    "name": "createStream",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      }
    ],
    "name": "encryptedBalanceOf",
    "outputs": [
      {
        "internalType": "euint128",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      }
    ],
    "name": "getStream",
    "outputs": [
      {
        "internalType": "address",
        "name": "employer",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "employee",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "rateHandle",
        "type": "bytes32"
      },
      {
        "internalType": "uint32",
        "name": "cadenceInSeconds",
        "type": "uint32"
      },
      {
        "internalType": "enum EncryptedPayroll.StreamStatus",
        "name": "status",
        "type": "uint8"
      },
      {
        "internalType": "uint64",
        "name": "startTime",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "lastAccruedAt",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      }
    ],
    "name": "getStreamConfig",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "streamId",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "cancelable",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "transferable",
        "type": "bool"
      },
      {
        "internalType": "address",
        "name": "hook",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "bufferedHandle",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "withdrawnHandle",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      }
    ],
    "name": "pauseStream",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "lookbackDays",
        "type": "uint256"
      }
    ],
    "name": "projectedIncome",
    "outputs": [
      {
        "internalType": "euint128",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "protocolId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      }
    ],
    "name": "resumeStream",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "hook",
        "type": "address"
      }
    ],
    "name": "setStreamHook",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      }
    ],
    "name": "streamIdFor",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "streamId",
        "type": "uint256"
      }
    ],
    "name": "streamKeyFor",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      }
    ],
    "name": "syncStream",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      },
      {
        "internalType": "externalEuint128",
        "name": "encAmount",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "amountProof",
        "type": "bytes"
      }
    ],
    "name": "topUp",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newAdmin",
        "type": "address"
      }
    ],
    "name": "transferAdmin",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "streamKey",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "withdrawMax",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
