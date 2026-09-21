export const lootboxAbi = [
  { type: "function", name: "boxPrice", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "availableBundleIds", stateMutability: "view", inputs: [], outputs: [{ type: "uint256[]" }] },
  { type: "function", name: "availableBundleCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "unreservedBundleCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "refund", stateMutability: "nonpayable", inputs: [{ name: "requestId", type: "uint256" }], outputs: [] },
  { type: "function", name: "claimPrize", stateMutability: "nonpayable", inputs: [{ name: "requestId", type: "uint256" }, { name: "recipient", type: "address" }], outputs: [] },
  { type: "function", name: "purchase", stateMutability: "nonpayable", inputs: [{ name: "expectedPrice", type: "uint256" }, { name: "deadline", type: "uint256" }], outputs: [{ name: "requestId", type: "uint256" }] },
  { type: "function", name: "fulfillDraw", stateMutability: "nonpayable", inputs: [{ name: "requestId", type: "uint256" }, { name: "providerEntropy", type: "bytes32" }], outputs: [{ name: "bundleId", type: "uint256" }] },
  { type: "function", name: "draws", stateMutability: "view", inputs: [{ name: "requestId", type: "uint256" }], outputs: [
    { name: "buyer", type: "address" }, { name: "requestedAt", type: "uint64" }, { name: "status", type: "uint8" }, { name: "delivered", type: "bool" }, { name: "pricePaid", type: "uint256" }, { name: "bundleId", type: "uint256" }, { name: "refundAt", type: "uint256" }
  ]},
  { type: "event", name: "DrawRequested", anonymous: false, inputs: [
    { indexed: true, name: "requestId", type: "uint256" }, { indexed: true, name: "buyer", type: "address" }, { indexed: false, name: "pricePaid", type: "uint256" }
  ]},
  {
  type: "event",
  name: "DrawFulfilled",
  anonymous: false,
  inputs: [
    {
      indexed: true,
      name: "requestId",
      type: "uint256",
    },
    {
      indexed: true,
      name: "buyer",
      type: "address",
    },
    {
      indexed: true,
      name: "bundleId",
      type: "uint256",
    },
    {
      indexed: false,
      name: "providerEntropy",
      type: "bytes32",
    },
    {
      indexed: false,
      name: "selectedIndex",
      type: "uint256",
    },
  ],
},
] as const;

export const erc20Abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
] as const;

export const bundlerAbi = [
  {
    type: "function",
    name: "tokensInBundle",
    stateMutability: "view",
    inputs: [
      {
        name: "_bundleId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          {
            name: "category",
            type: "uint8",
          },
          {
            name: "assetAddress",
            type: "address",
          },
          {
            name: "id",
            type: "uint256",
          },
          {
            name: "amount",
            type: "uint256",
          },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      {
        name: "account",
        type: "address",
      },
      {
        name: "id",
        type: "uint256",
      },
    ],
    outputs: [
      {
        type: "uint256",
      },
    ],
  },
  {
    type: "function",
    name: "unwrap",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "_bundleId",
        type: "uint256",
      },
    ],
    outputs: [],
  },
] as const;