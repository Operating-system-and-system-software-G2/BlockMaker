const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlockCharacterNFT", function () {
  let blockCharacterNFT;
  let owner;
  let player;

  beforeEach(async function () {
    [owner, player] = await ethers.getSigners();
    
    const BlockCharacterNFT = await ethers.getContractFactory("BlockCharacterNFT");
    blockCharacterNFT = await BlockCharacterNFT.deploy();
    await blockCharacterNFT.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await blockCharacterNFT.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await blockCharacterNFT.name()).to.equal("BlockCharacter");
      expect(await blockCharacterNFT.symbol()).to.equal("BCHAR");
    });
  });

  describe("Minting", function () {
    it("Should mint NFT successfully", async function () {
      const tokenURI = "ipfs://QmTestHash123";
      
      const tx = await blockCharacterNFT.mintCharacter(player.address, tokenURI);
      const receipt = await tx.wait();
      
      // 토큰이 제대로 민팅되었는지 확인
      expect(await blockCharacterNFT.ownerOf(1)).to.equal(player.address);
      expect(await blockCharacterNFT.tokenURI(1)).to.equal(tokenURI);
      expect(await blockCharacterNFT.getTotalTokens()).to.equal(1);
    });

    it("Should emit CharacterMinted event", async function () {
      const tokenURI = "ipfs://QmTestHash456";
      
      await expect(blockCharacterNFT.mintCharacter(player.address, tokenURI))
        .to.emit(blockCharacterNFT, "CharacterMinted")
        .withArgs(1, player.address, tokenURI);
    });

    it("Should mint multiple NFTs with incremental token IDs", async function () {
      await blockCharacterNFT.mintCharacter(player.address, "ipfs://QmTestHash1");
      await blockCharacterNFT.mintCharacter(player.address, "ipfs://QmTestHash2");
      
      expect(await blockCharacterNFT.getTotalTokens()).to.equal(2);
      expect(await blockCharacterNFT.ownerOf(1)).to.equal(player.address);
      expect(await blockCharacterNFT.ownerOf(2)).to.equal(player.address);
    });
  });

  describe("Token URI", function () {
    it("Should return correct token URI", async function () {
      const tokenURI = "ipfs://QmTestHashURI";
      await blockCharacterNFT.mintCharacter(player.address, tokenURI);
      
      expect(await blockCharacterNFT.tokenURI(1)).to.equal(tokenURI);
    });
  });
}); 