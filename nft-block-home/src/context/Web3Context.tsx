import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import BlockNFTAbi from '../contracts/BlockNFT.json';

// Contract 타입 정의를 간소화합니다
type Contract = any;

interface Web3ContextType {
  web3: Web3 | null;
  account: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  contract: Contract | null;
  balance: string;
  network: string;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  mintNFT: (tokenURI: string) => Promise<number | null>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const useWeb3 = (): Web3ContextType => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [network, setNetwork] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const NFT_CONTRACT_ADDRESS = process.env.REACT_APP_NFT_CONTRACT_ADDRESS || '';

  // 네트워크 ID를 네트워크 이름으로 변환
  const getNetworkName = (id: number): string => {
    switch (id) {
      case 1:
        return 'Ethereum Mainnet';
      case 5:
        return 'Goerli Testnet';
      case 11155111:
        return 'Sepolia Testnet';
      case 137:
        return 'Polygon Mainnet';
      case 80001:
        return 'Mumbai Testnet';
      case 44787:
        return 'Celo Alfajores Testnet';
      case 42220:
        return 'Celo Mainnet';
      default:
        return `Unknown Network (${id})`;
    }
  };

  // 지갑 계정 정보 조회
  const loadAccountData = async (_web3: Web3, _account: string) => {
    try {
      const weiBalance = await _web3.eth.getBalance(_account);
      const ethBalance = _web3.utils.fromWei(weiBalance, 'ether');
      setBalance(parseFloat(ethBalance).toFixed(4));

      const networkId = await _web3.eth.net.getId();
      // BigInt일 경우 처리
      const networkIdNumber = typeof networkId === 'bigint' ? Number(networkId) : Number(networkId);
      setNetwork(getNetworkName(networkIdNumber));

      // 디버깅 로그 추가
      console.log('NFT_CONTRACT_ADDRESS:', NFT_CONTRACT_ADDRESS);
      console.log('NFT_CONTRACT_ADDRESS 유효성:', Boolean(NFT_CONTRACT_ADDRESS));
      console.log('현재 네트워크:', getNetworkName(networkIdNumber));

      // NFT 컨트랙트 연결
      if (NFT_CONTRACT_ADDRESS) {
        console.log('ABI 타입:', typeof BlockNFTAbi);
        console.log('ABI 구조:', BlockNFTAbi ? 'ABI 존재' : 'ABI 미존재');
        
        try {
          const _contract = new _web3.eth.Contract(
            BlockNFTAbi as AbiItem[],
            NFT_CONTRACT_ADDRESS
          );
          console.log('컨트랙트 초기화 성공:', Boolean(_contract));
          setContract(_contract);
        } catch (contractError) {
          console.error('컨트랙트 초기화 오류:', contractError);
        }
      }
    } catch (err: any) {
      console.error('계정 데이터 로드 오류:', err);
      setError(err.message || '계정 데이터를 로드하는 동안 오류가 발생했습니다.');
    }
  };

  // 지갑 연결 함수
  const connectWallet = async (): Promise<void> => {
    setIsConnecting(true);
    setError(null);

    // window.ethereum이 존재하는지 확인
    if (typeof window.ethereum === 'undefined') {
      setError('MetaMask가 설치되어 있지 않습니다. MetaMask를 설치해주세요.');
      setIsConnecting(false);
      return;
    }

    try {
      // 계정 권한 요청
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('연결된 계정이 없습니다.');
      }

      const _account = accounts[0];
      const _web3 = new Web3(window.ethereum as any);

      setWeb3(_web3);
      setAccount(_account);
      setIsConnected(true);

      // 계정 데이터 로드
      await loadAccountData(_web3, _account);

      // 계정 변경 이벤트 리스너 설정
      window.ethereum.on('accountsChanged', (newAccounts: string[]) => {
        if (newAccounts.length === 0) {
          disconnectWallet();
        } else {
          const newAccount = newAccounts[0];
          setAccount(newAccount);
          if (_web3) {
            loadAccountData(_web3, newAccount);
          }
        }
      });

      // 네트워크 변경 이벤트 리스너 설정
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    } catch (err: any) {
      console.error('지갑 연결 오류:', err);
      setError(err.message || '지갑 연결 중 오류가 발생했습니다.');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  // 지갑 연결 해제 함수
  const disconnectWallet = () => {
    setWeb3(null);
    setAccount(null);
    setContract(null);
    setBalance('0');
    setNetwork('');
    setIsConnected(false);
    setError(null);
  };

  // NFT 민팅 함수
  const mintNFT = async (tokenURI: string): Promise<number | null> => {
    if (!contract || !account) {
      throw new Error('지갑이 연결되어 있지 않거나 컨트랙트가 초기화되지 않았습니다.');
    }
    
    console.log(`NFT 민팅 시작: tokenURI = ${tokenURI}`);
    console.log(`컨트랙트 주소: ${NFT_CONTRACT_ADDRESS}`);
    console.log(`민팅 계정: ${account}`);
    
    // tokenURI가 ipfs:// 프로토콜인 경우 그대로 사용 (스마트 컨트랙트가 처리)
    // 이미 ipfs:// 형식인지 확인
    if (!tokenURI.startsWith('ipfs://')) {
      console.warn('토큰 URI가 ipfs:// 형식이 아닙니다. 현재 URI:', tokenURI);
    }
    console.log(`토큰 URI: ${tokenURI}`);
    
    // 컨트랙트의 모든 메서드 로깅 (디버깅용)
    try {
      console.log('컨트랙트 메서드 확인:');
      const methods = Object.keys(contract.methods);
      console.log('- 사용 가능한 메서드:', methods);
      
      // mintCharacter 메서드 존재 확인
      if (!contract.methods.mintCharacter) {
        console.error('mintCharacter 메서드가 컨트랙트에 존재하지 않습니다!');
        
        // 대안 찾기
        if (contract.methods.mintNFT) {
          console.log('대안 메서드 찾음: mintNFT - 이것을 사용합니다');
        } else if (contract.methods.mint) {
          console.log('대안 메서드 찾음: mint - 이것을 사용합니다');
        } else {
          console.error('적합한 민팅 메서드를 찾을 수 없습니다!');
          throw new Error('적합한 민팅 메서드를 찾을 수 없습니다. 컨트랙트 ABI를 확인해주세요.');
        }
      }
    } catch (err) {
      console.warn('컨트랙트 메서드 확인 중 오류:', err);
    }

    try {
      // 컨트랙트에 따라 적절한 민팅 메서드 선택
      let mintMethod;
      if (contract.methods.mintCharacter) {
        console.log('mintCharacter 메서드 사용');
        mintMethod = contract.methods.mintCharacter(account, tokenURI);
      } else if (contract.methods.mintNFT) {
        console.log('mintNFT 메서드 사용');
        mintMethod = contract.methods.mintNFT(account, tokenURI);
      } else if (contract.methods.mint) {
        console.log('mint 메서드 사용');
        mintMethod = contract.methods.mint(account, tokenURI);
      } else {
        throw new Error('적합한 민팅 메서드를 찾을 수 없습니다');
      }
      
      // gas 추정
      const gasEstimate = await mintMethod.estimateGas({ from: account });
      console.log(`가스 추정값: ${gasEstimate}`);
      
      // BigInt 타입 에러를 방지하기 위해 숫자 타입으로 변환
      const gasEstimateNumber = typeof gasEstimate === 'bigint' 
        ? Number(gasEstimate) 
        : Number(gasEstimate);
        
      console.log('변환된 가스 추정값:', gasEstimateNumber);
      console.log('사용할 가스:', gasEstimateNumber + 50000); // 추가 가스 제공

      // 민팅 트랜잭션 전송
      console.log("트랜잭션 전송 중...");
      const receipt = await mintMethod.send({
        from: account,
        gas: gasEstimateNumber + 50000 // 추가 가스 제공
      });
      
      console.log("트랜잭션 영수증:", receipt);

      // 트랜잭션 성공 여부 확인
      if (receipt.status) {
        console.log("NFT 민팅 성공!");
        
        // 이벤트에서 tokenId 추출
        if (receipt.events && receipt.events.Transfer) {
          const tokenId = receipt.events.Transfer.returnValues.tokenId;
          console.log(`민팅된 토큰 ID: ${tokenId}`);
          
          // 민팅 후 추가 검증: 토큰 URI가 제대로 설정되었는지 확인
          try {
            if (contract.methods.tokenURI) {
              const tokenURI_contract = await contract.methods.tokenURI(tokenId).call();
              console.log(`설정된 토큰 URI 확인: ${tokenURI_contract}`);
              
              if (tokenURI_contract !== tokenURI) {
                console.warn('경고: 컨트랙트에 설정된 토큰 URI가 전달한 값과 다릅니다.', {
                  expected: tokenURI,
                  actual: tokenURI_contract
                });
              } else {
                console.log("토큰 URI가 정상적으로 설정되었습니다.");
              }
            }
            
            // 토큰 소유자 확인
            if (contract.methods.ownerOf) {
              const owner = await contract.methods.ownerOf(tokenId).call();
              console.log(`토큰 소유자 확인: ${owner}`);
              
              if (owner.toLowerCase() !== account.toLowerCase()) {
                console.warn('경고: 토큰 소유자가 예상한 계정과 다릅니다.', {
                  expected: account,
                  actual: owner
                });
              }
            }
          } catch (err) {
            console.error("토큰 검증 중 오류 발생:", err);
          }
          
          // MetaMask를 위한 힌트 로그
          console.log(`
=======================================================
🎉 NFT가 성공적으로 민팅되었습니다!
-------------------------------------------------------
MetaMask에서 확인하려면:
1. MetaMask 앱 열기 > NFT 탭
2. [NFT 가져오기] 버튼 클릭
3. 컨트랙트 주소: ${NFT_CONTRACT_ADDRESS}
4. 토큰 ID: ${tokenId}
=======================================================
          `);
          
          return Number(tokenId);
        } else {
          console.error("Transfer 이벤트가 없습니다.");
          return null;
        }
      } else {
        console.error("트랜잭션 실패");
        return null;
      }
    } catch (error: any) {
      console.error("NFT 민팅 오류:", error);
      throw error;
    }
  };

  // 페이지 로드 시 이미 연결된 계정이 있는지 확인
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts',
          });
          
          if (accounts.length > 0) {
            const _web3 = new Web3(window.ethereum as any);
            const _account = accounts[0];
            
            setWeb3(_web3);
            setAccount(_account);
            setIsConnected(true);
            
            await loadAccountData(_web3, _account);
          }
        } catch (err) {
          console.error('이미 연결된 계정 확인 중 오류:', err);
        }
      }
    };
    
    checkConnection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    web3,
    account,
    isConnected,
    isConnecting,
    contract,
    balance,
    network,
    error,
    connectWallet,
    disconnectWallet,
    mintNFT
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}; 