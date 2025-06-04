const hre = require("hardhat");

async function main() {
  console.log("BlockCharacterNFT 컨트랙트 배포 시작...");

  // 컨트랙트 팩토리 가져오기
  const BlockCharacterNFT = await hre.ethers.getContractFactory("BlockCharacterNFT");
  
  // 컨트랙트 배포
  console.log("컨트랙트 배포 중...");
  const contract = await BlockCharacterNFT.deploy();
  
  // 배포 완료 대기
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  
  console.log("BlockCharacterNFT 배포 완료!");
  console.log("컨트랙트 주소:", contractAddress);
  console.log("네트워크:", (await hre.ethers.provider.getNetwork()).name);
  
  // 배포 정보를 파일로 저장
  const deploymentInfo = {
    contractAddress: contractAddress,
    network: (await hre.ethers.provider.getNetwork()).name,
    deployedAt: new Date().toISOString(),
    contractName: "BlockCharacterNFT",
    symbol: "BCHAR"
  };
  
  console.log("\n 배포 정보:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  // .env 파일 업데이트를 위한 정보 출력
  console.log("\n .env 파일에 추가할 내용:");
  console.log(`REACT_APP_NFT_CONTRACT_ADDRESS=${contractAddress}`);
  
  // 컨트랙트 검증을 위한 정보 출력
  console.log("\ n컨트랙트 검증 명령어:");
  console.log(`npx hardhat verify --network <네트워크명> ${contractAddress}`);
}

// 에러 핸들링
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("배포 중 오류 발생:", error);
    process.exit(1);
  }); 