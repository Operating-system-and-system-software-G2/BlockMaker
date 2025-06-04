import axios from 'axios';
import { Buffer } from 'buffer';

// 환경 변수에서 Pinata JWT 토큰 로드
const PINATA_JWT = process.env.REACT_APP_PINATA_JWT;

// Pinata API 클라이언트 설정 - JWT 인증 방식 사용
const pinataApiClient = axios.create({
  baseURL: 'https://api.pinata.cloud',
  headers: {
    'Authorization': `Bearer ${PINATA_JWT}`
  }
});

// 로컬 IPFS 데몬 사용 설정 (백업용)
const ipfsClient = axios.create({
  baseURL: 'http://localhost:5001/api/v0'
});

// 공개 IPFS 게이트웨이 URL (지갑에서 접근 가능)
export const PUBLIC_IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';
// 백업 게이트웨이 (첫 번째가 실패할 경우)
export const BACKUP_IPFS_GATEWAY = 'https://ipfs.io/ipfs/';
// Infura IPFS 게이트웨이 (검색 가능한 유명한 노드)
export const INFURA_IPFS_GATEWAY = 'https://ipfs.infura.io/ipfs/';

/**
 * 이미지를 IPFS에 업로드하는 함수 - Pinata API 우선 사용
 */
export const uploadImageToIPFS = async (file: File): Promise<string> => {
  try {
    console.log(`IPFS에 이미지 업로드 시작: ${file.name} (${file.size} bytes)`);

    // 이미지 크기 체크 (500KB 이상이면 경고)
    if (file.size > 500 * 1024) {
      console.warn('이미지 크기가 500KB를 초과합니다. 이미지 크기가 클수록 표시 문제가 발생할 확률이 높아집니다.');
    }

    // Pinata API 키 확인
    if (!PINATA_JWT) {
      console.warn('Pinata JWT가 설정되지 않았습니다. 로컬 IPFS 노드로 대체합니다.');
      return uploadToLocalIPFS(file);
    }

    try {
      // 파일을 버퍼로 변환
      const buffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(buffer);

      // FormData 생성
      const formData = new FormData();
      formData.append('file', new Blob([fileBuffer]), file.name);
      
      // 메타데이터 추가
      const pinataMetadata = JSON.stringify({
        name: file.name,
        keyvalues: {
          timestamp: new Date().toISOString(),
          type: 'block-character-image'
        }
      });
      formData.append('pinataMetadata', pinataMetadata);
      
      // 업로드 옵션 설정
      const pinataOptions = JSON.stringify({
        cidVersion: 0
      });
      formData.append('pinataOptions', pinataOptions);
      
      console.log('Pinata API에 이미지 업로드 중...');
      
      // Pinata API에 업로드
      const response = await pinataApiClient.post('/pinning/pinFileToIPFS', formData, {
        maxBodyLength: Infinity,
        headers: {
          'Content-Type': `multipart/form-data;`
        }
      });
      
      console.log('Pinata 응답:', response.data);
      
      if (!response.data || !response.data.IpfsHash) {
        throw new Error('Pinata 응답에 해시가 없습니다');
      }
      
      // 해시 추출
      const hash = response.data.IpfsHash;
      
      // ipfs:// 프로토콜 URL
      const ipfsUrl = `ipfs://${hash}`;
      console.log(`IPFS URI 생성: ${ipfsUrl}`);
      
      // HTTP 게이트웨이 URL (참조용)
      const httpUrl = `${PUBLIC_IPFS_GATEWAY}${hash}`;
      console.log(`HTTP 게이트웨이 URL: ${httpUrl}`);
      
      // 이미지가 게이트웨이에서 접근 가능한지 확인
      setTimeout(async () => {
        try {
          const response = await fetch(httpUrl, { method: 'HEAD' });
          if (response.ok) {
            console.log('✅ 이미지가 Pinata 게이트웨이에서 확인됨:', httpUrl);
          } else {
            console.warn('⚠️ 이미지가 아직 Pinata 게이트웨이에서 접근 불가능합니다.');
            
            // 백업 게이트웨이 확인
            try {
              const backupUrl = `${BACKUP_IPFS_GATEWAY}${hash}`;
              const backupResponse = await fetch(backupUrl, { method: 'HEAD' });
              if (backupResponse.ok) {
                console.log('✅ 이미지가 백업 게이트웨이에서 확인됨:', backupUrl);
              } else {
                console.warn('⚠️ 이미지가 백업 게이트웨이에서도 접근 불가능합니다.');
              }
            } catch (err) {
              console.warn('백업 게이트웨이 확인 중 오류:', err);
            }
          }
        } catch (error) {
          console.warn('게이트웨이 확인 중 오류:', error);
        }
      }, 3000);
      
      // ipfs:// 프로토콜 URL 반환
      return ipfsUrl;
    } catch (pinataError) {
      console.error('Pinata 업로드 오류:', pinataError);
      console.log('로컬 IPFS 노드로 대체 시도...');
      return uploadToLocalIPFS(file);
    }
  } catch (error: any) {
    console.error('IPFS 이미지 업로드 오류:', error);
    throw new Error(`IPFS에 이미지를 업로드하는 중 오류가 발생했습니다: ${error.message}`);
  }
};

// 로컬 IPFS 노드에 업로드하는 백업 함수
const uploadToLocalIPFS = async (file: File): Promise<string> => {
  try {
    console.log('로컬 IPFS 노드에 이미지 업로드 중...');
    
    // 파일을 버퍼로 변환
    const buffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(buffer);

    // FormData 생성
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), file.name);
    
    // IPFS 업로드 설정
    const params = new URLSearchParams({
      pin: 'true'
    });

    // 로컬 IPFS API로 파일 업로드
    const response = await ipfsClient.post('/add', formData, {
      params,
      timeout: 30000
    });
    
    if (!response.data || !response.data.Hash) {
      throw new Error('IPFS 업로드 응답에 해시가 없습니다');
    }
    
    console.log('로컬 IPFS 업로드 응답:', response.data);

    // 응답에서 IPFS 해시 추출
    const { Hash: hash } = response.data;
    
    // ipfs:// 프로토콜 URL
    const ipfsUrl = `ipfs://${hash}`;
    console.log(`IPFS URI 생성: ${ipfsUrl}`);
    
    // 경고: 로컬 IPFS 노드 사용 시 이미지가 외부에서 접근 불가능할 수 있음
    console.warn('⚠️ 로컬 IPFS 노드를 사용하고 있습니다. 이미지가 외부에서 접근 불가능할 수 있습니다.');
    
    return ipfsUrl;
  } catch (error: any) {
    console.error('로컬 IPFS 업로드 오류:', error);
    throw error;
  }
};

/**
 * 메타데이터를 IPFS에 업로드하는 함수 - Pinata API 우선 사용
 */
export const uploadMetadataToIPFS = async (
  name: string,
  description: string,
  imageUrl: string,
  attributes: Array<{ trait_type: string; value: string | number }>
): Promise<string> => {
  try {
    console.log('IPFS에 메타데이터 업로드 시작');
    console.log('원본 이미지 URL:', imageUrl);
    
    // 이미지 해시 추출 (ipfs:// 프로토콜에서)
    let imageHash = "";
    
    if (imageUrl.startsWith('ipfs://')) {
      imageHash = imageUrl.replace('ipfs://', '');
      console.log(`이미지 해시 추출: ${imageHash} (ipfs:// 프로토콜에서)`);
    } else if (imageUrl.includes('/ipfs/')) {
      imageHash = imageUrl.split('/ipfs/')[1];
      console.log(`이미지 해시 추출: ${imageHash} (HTTP URL에서)`);
    } else {
      console.warn('이미지 URL에서 IPFS 해시를 추출할 수 없습니다:', imageUrl);
    }
    
    // 직접 해시가 유효한지 검증
    if (imageHash) {
      try {
        const checkUrl = `${PUBLIC_IPFS_GATEWAY}${imageHash}`;
        console.log('이미지 접근성 검증:', checkUrl);
        const response = await fetch(checkUrl, { method: 'HEAD' });
        if (response.ok) {
          console.log('✅ 이미지 접근 확인됨:', checkUrl);
        } else {
          console.warn(`⚠️ 이미지 접근 확인 실패 (${response.status}), URL:`, checkUrl);
          
          // 백업 게이트웨이 확인
          const backupUrl = `${BACKUP_IPFS_GATEWAY}${imageHash}`;
          try {
            const backupResponse = await fetch(backupUrl, { method: 'HEAD' });
            if (backupResponse.ok) {
              console.log('✅ 백업 게이트웨이에서 이미지 접근 가능:', backupUrl);
            } else {
              console.warn('⚠️ 백업 게이트웨이에서도 이미지 접근 불가능');
            }
          } catch (err) {
            console.warn('백업 게이트웨이 확인 중 오류:', err);
          }
        }
      } catch (err) {
        console.warn('이미지 검증 중 오류:', err);
      }
    }
    
    // 메타데이터 URL 형식
    const ipfsProtocolUrl = imageHash ? `ipfs://${imageHash}` : imageUrl;
    
    // MetaMask와 최대한 호환되는 메타데이터 구조
    // 핵심: 표준 ERC-721 메타데이터 형식 준수
    const metadata = {
      name,                      // 이름
      description,               // 설명
      image: ipfsProtocolUrl,    // 표준 IPFS URL (ipfs://)
      attributes                 // 속성 배열
    };
    
    // 메타데이터 로깅 (디버깅 용도)
    console.log('메타데이터:', JSON.stringify(metadata, null, 2));
    
    // 메타데이터를 JSON 문자열로 변환
    const metadataJSON = JSON.stringify(metadata, null, 2);
    
    // Pinata API 키 확인
    if (PINATA_JWT) {
      try {
        console.log('Pinata API를 사용하여 메타데이터 업로드 중...');
        
        // JSON 직접 업로드 (파일로 업로드하지 않고)
        const response = await pinataApiClient.post('/pinning/pinJSONToIPFS', metadata, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Pinata 메타데이터 업로드 응답:', response.data);
        
        if (!response.data || !response.data.IpfsHash) {
          throw new Error('Pinata 응답에 해시가 없습니다');
        }
        
        // 해시 추출
        const hash = response.data.IpfsHash;
        
        // 메타데이터 URL 형식 (ipfs:// 프로토콜 사용)
        const ipfsMetadataUrl = `ipfs://${hash}`;
        console.log(`메타데이터 IPFS URL: ${ipfsMetadataUrl}`);
        
        // HTTP 게이트웨이 URL도 로깅 (참조용)
        const httpMetadataUrl = `${PUBLIC_IPFS_GATEWAY}${hash}`;
        console.log(`메타데이터 HTTP URL: ${httpMetadataUrl}`);
        
        // 메타데이터 검증 (3초 후)
        validateMetadata(hash, httpMetadataUrl);
        
        return ipfsMetadataUrl;
      } catch (pinataError) {
        console.error('Pinata 메타데이터 업로드 오류:', pinataError);
        console.log('로컬 IPFS 노드로 대체 시도...');
      }
    }
    
    // Pinata 실패 또는 API 키 없음 - 로컬 IPFS 노드로 대체
    console.log('로컬 IPFS 노드에 메타데이터 업로드 중...');
    const metadataBuffer = Buffer.from(metadataJSON);
    
    // FormData 생성
    const formData = new FormData();
    formData.append('file', new Blob([metadataBuffer]), 'metadata.json');
    
    // pin=true 파라미터 추가
    const params = new URLSearchParams({
      pin: 'true'
    });
    
    // IPFS API로 메타데이터 업로드
    const response = await ipfsClient.post('/add', formData, {
      params,
      timeout: 30000
    });
    
    console.log('IPFS 메타데이터 업로드 응답:', response.data);
    
    // 응답에서 IPFS 해시 추출
    const { Hash: hash } = response.data;
    
    if (!hash) {
      throw new Error('IPFS 메타데이터 해시를 받지 못했습니다.');
    }
    
    // 메타데이터 URL 형식 (ipfs:// 프로토콜 사용)
    const ipfsMetadataUrl = `ipfs://${hash}`;
    console.log(`메타데이터 IPFS URL: ${ipfsMetadataUrl}`);
    
    // HTTP 게이트웨이 URL도 로깅 (참조용)
    const httpMetadataUrl = `${PUBLIC_IPFS_GATEWAY}${hash}`;
    console.log(`메타데이터 HTTP URL: ${httpMetadataUrl}`);
    
    // 메타데이터 검증 (3초 후)
    validateMetadata(hash, httpMetadataUrl);
    
    // 경고: 로컬 IPFS 노드를 사용할 때 접근성 문제
    console.warn('⚠️ 로컬 IPFS 노드를 사용하고 있습니다. 메타데이터가 외부에서 접근 불가능할 수 있습니다.');
    
    // ipfs:// 프로토콜 URL 반환 (더 표준화된 방식)
    return ipfsMetadataUrl;
  } catch (error: any) {
    console.error('IPFS 메타데이터 업로드 오류:', error);
    throw new Error(`IPFS에 메타데이터를 업로드하는 중 오류가 발생했습니다: ${error.message}`);
  }
};

// 메타데이터 검증 함수
const validateMetadata = (hash: string, httpMetadataUrl: string) => {
  setTimeout(async () => {
    try {
      console.log('메타데이터 접근성 확인 중:', httpMetadataUrl);
      const response = await fetch(httpMetadataUrl);
      if (response.ok) {
        console.log('메타데이터가 게이트웨이에서 접근 가능합니다:', httpMetadataUrl);
        
        // 메타데이터의 내용도 확인
        const metadata = await response.json();
        console.log('메타데이터 내용 확인:', metadata);
        
        // 이미지 URL이 메타데이터에서 올바르게 표시되는지 확인
        if (metadata.image) {
          console.log('메타데이터에서 이미지 URL 확인:', metadata.image);
          
          // 이미지가 실제로 접근 가능한지 확인
          try {
            const imgResponse = await fetch(
              metadata.image.startsWith('ipfs://') 
                ? metadata.image.replace('ipfs://', PUBLIC_IPFS_GATEWAY) 
                : metadata.image, 
              { method: 'HEAD' }
            );
            if (imgResponse.ok) {
              console.log('✅ 이미지가 게이트웨이에서 확인됨:', metadata.image);
            } else {
              console.warn('⚠️ 이미지를 게이트웨이에서 찾을 수 없음. 상태:', imgResponse.status);
              
              // 대체 게이트웨이 시도
              if (metadata.image.startsWith('ipfs://')) {
                const hash = metadata.image.replace('ipfs://', '');
                const alternateUrl = `${BACKUP_IPFS_GATEWAY}${hash}`;
                
                try {
                  const altResponse = await fetch(alternateUrl, { method: 'HEAD' });
                  if (altResponse.ok) {
                    console.log('✅ 대체 게이트웨이에서 이미지 확인됨:', alternateUrl);
                  } else {
                    console.warn('⚠️ 대체 게이트웨이에서도 이미지를 찾을 수 없음');
                  }
                } catch (err) {
                  console.warn('대체 게이트웨이 확인 오류:', err);
                }
              }
            }
          } catch (err) {
            console.warn('이미지 확인 중 오류:', err);
          }
        }
      } else {
        console.warn('메타데이터가 아직 게이트웨이에서 접근 불가능합니다. 전파 중일 수 있습니다.');
      }
    } catch (err) {
      console.warn('메타데이터 접근성 확인 실패:', err);
    }
  }, 3000);
};

// IPFS 게이트웨이 URL 생성 (다른 함수에서 사용할 수 있음)
export const getIpfsGatewayUrl = (ipfsHash: string): string => {
  if (ipfsHash.startsWith('ipfs://')) {
    ipfsHash = ipfsHash.replace('ipfs://', '');
  }
  
  // 항상 공개 게이트웨이 사용
  return `${PUBLIC_IPFS_GATEWAY}${ipfsHash}`;
};

// IPFS 해시가 있을 경우 여러 형식의 URL 반환
export const getIpfsUrls = (ipfsHash: string): { 
  ipfsUrl: string; 
  httpUrl: string; 
  backupUrl: string;
  infuraUrl: string;
} => {
  // ipfs:// 프로토콜이 포함되어 있으면 제거
  if (ipfsHash.startsWith('ipfs://')) {
    ipfsHash = ipfsHash.replace('ipfs://', '');
  }
  
  // /ipfs/ 경로가 포함되어 있으면 추출
  if (ipfsHash.includes('/ipfs/')) {
    ipfsHash = ipfsHash.split('/ipfs/')[1];
  }
  
  return {
    ipfsUrl: `ipfs://${ipfsHash}`,
    httpUrl: `${PUBLIC_IPFS_GATEWAY}${ipfsHash}`,
    backupUrl: `${BACKUP_IPFS_GATEWAY}${ipfsHash}`,
    infuraUrl: `${INFURA_IPFS_GATEWAY}${ipfsHash}`
  };
};

// IPFS에 파일이 존재하는지 확인하는 함수
export const checkIpfsFile = async (cid: string): Promise<boolean> => {
  try {
    // 공개 게이트웨이로 확인
    const url = `${PUBLIC_IPFS_GATEWAY}${cid}`;
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('IPFS 파일 확인 오류:', error);
    return false;
  }
}; 