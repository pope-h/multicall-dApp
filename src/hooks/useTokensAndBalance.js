import { useEffect, useMemo, useState } from "react";
import { tokens as tokenlist } from "../tokenlist.json";
import { isAddress, ZeroAddress, Interface, Contract, JsonRpcProvider } from "ethers";
import erc20Abi from "../abi/erc20.json";
import { multicall2Address } from "../constant";
import multicallAbi from "../abi/multicall2.json";

const mainnetTokens = tokenlist.filter((token) => token.chainId === 1);
console.log("mainnetToken", mainnetTokens);

const useTokensAndBalance = (address) => {
  const [tokens, setTokens] = useState([]);
  
  const tokenAddresses = useMemo(
    () => mainnetTokens.map((token) => token.address),
    []
  );

  const validAddress = useMemo(
    () => (isAddress(address) ? address : ZeroAddress),
    [address]
  );

  const IERC20 = useMemo(() => new Interface(erc20Abi), []);

  const calls = useMemo(
    () =>
      tokenAddresses.map((address) => ({
        target: address,
        callData: IERC20.encodeFunctionData("balanceOf", [validAddress]),
      })),
    [IERC20, tokenAddresses, validAddress]
  );

  useEffect(() => {
    (async () => {
      const provider = new JsonRpcProvider(
        import.meta.env.VITE_mainnet_rpc_url
      );

      const multicall = new Contract(multicall2Address, multicallAbi, provider);

      // eslint-disable-next-line no-unused-vars
      const [_, balancesResult] = await multicall.aggregate.staticCall(calls);

      const decodedBalances = balancesResult.map((result) =>
        IERC20.decodeFunctionResult("balanceOf", result).toString()
      );

      const newObj = mainnetTokens.map((token, index) => ({
        ...token,
        balance: decodedBalances[index],
      }));

      setTokens(newObj);
    })();
  }, [IERC20, calls]);

  return { tokens, address: validAddress };
};

export default useTokensAndBalance;
