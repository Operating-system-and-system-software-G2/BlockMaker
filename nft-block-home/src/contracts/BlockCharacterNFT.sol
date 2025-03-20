// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BlockCharacterNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    
    // 이벤트: NFT 민팅 시 발생
    event CharacterMinted(uint256 tokenId, address owner, string tokenURI);
    
    constructor() ERC721("BlockCharacter", "BCHAR") {}
    
    // NFT 민팅 함수
    function mintCharacter(address player, string memory tokenURI) public returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _mint(player, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        
        emit CharacterMinted(newTokenId, player, tokenURI);
        
        return newTokenId;
    }
    
    // 토큰 ID 총 개수 반환
    function getTotalTokens() public view returns (uint256) {
        return _tokenIds.current();
    }
} 