// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BlockCharacterNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    
    // 이벤트: NFT 민팅 시 발생
    event CharacterMinted(uint256 tokenId, address owner, string tokenURI);
    
    constructor() ERC721("BlockCharacter", "BCHAR") Ownable(msg.sender) {
        _nextTokenId = 1; // 토큰 ID를 1부터 시작
    }
    
    // NFT 민팅 함수
    function mintCharacter(address player, string memory tokenURI) public returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        
        _mint(player, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        emit CharacterMinted(tokenId, player, tokenURI);
        
        return tokenId;
    }
    
    // 토큰 ID 총 개수 반환
    function getTotalTokens() public view returns (uint256) {
        return _nextTokenId - 1;
    }
} 