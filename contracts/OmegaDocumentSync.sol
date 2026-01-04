// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Omega Document Sync
 * @notice Stores document hashes for cross-device sync on Omega Network
 * @dev Documents are synced by storing their hash, not the content (privacy-preserving)
 */
contract OmegaDocumentSync {
    // Struct to store document information
    struct Document {
        string documentId;      // Unique document identifier
        string documentHash;    // SHA-256 hash of document content
        string omegaId;         // Omega ID of the owner
        string fileName;        // Original filename
        string documentType;    // Type: 'word', 'sheets', 'slides', etc.
        uint256 timestamp;      // When document was synced
        bool exists;           // Whether document exists
    }
    
    // Mapping from Omega ID to array of document IDs
    mapping(string => string[]) public omegaDocuments;
    
    // Mapping from document ID to Document struct
    mapping(string => Document) public documents;
    
    // Events
    event DocumentSynced(
        string indexed omegaId,
        string indexed documentId,
        string documentHash,
        string fileName,
        string documentType,
        uint256 timestamp
    );
    
    event DocumentRemoved(
        string indexed omegaId,
        string indexed documentId,
        uint256 timestamp
    );
    
    // Modifiers
    modifier validDocumentId(string memory documentId) {
        require(
            bytes(documentId).length > 0,
            "Document ID cannot be empty"
        );
        require(
            bytes(documentId).length <= 200,
            "Document ID too long"
        );
        _;
    }
    
    /**
     * @notice Sync a document hash to Omega Network
     * @param documentId Unique document identifier
     * @param documentHash SHA-256 hash of document content (0x prefixed hex string)
     * @param omegaId Omega ID of the document owner
     * @param fileName Original filename
     * @param documentType Type of document ('word', 'sheets', 'slides', etc.)
     */
    function syncDocument(
        string memory documentId,
        string memory documentHash,
        string memory omegaId,
        string memory fileName,
        string memory documentType
    ) external validDocumentId(documentId) {
        require(
            bytes(documentHash).length > 0,
            "Document hash cannot be empty"
        );
        require(
            bytes(omegaId).length > 0,
            "Omega ID cannot be empty"
        );
        
        // Create or update document
        Document storage doc = documents[documentId];
        
        // If document doesn't exist, add it to omegaDocuments array
        if (!doc.exists) {
            omegaDocuments[omegaId].push(documentId);
        }
        
        // Update document
        doc.documentId = documentId;
        doc.documentHash = documentHash;
        doc.omegaId = omegaId;
        doc.fileName = fileName;
        doc.documentType = documentType;
        doc.timestamp = block.timestamp;
        doc.exists = true;
        
        emit DocumentSynced(
            omegaId,
            documentId,
            documentHash,
            fileName,
            documentType,
            block.timestamp
        );
    }
    
    /**
     * @notice Get all document IDs for an Omega ID
     * @param omegaId The Omega ID to query
     * @return documentIds Array of document IDs
     */
    function getDocuments(string memory omegaId)
        external
        view
        returns (string[] memory documentIds)
    {
        return omegaDocuments[omegaId];
    }
    
    /**
     * @notice Get document information by document ID
     * @param documentId The document ID to query
     * @return documentHash The document hash
     * @return omegaId The Omega ID of the owner
     * @return fileName The original filename
     * @return documentType The type of document
     * @return timestamp When document was synced
     * @return exists Whether document exists
     */
    function getDocument(string memory documentId)
        external
        view
        returns (
            string memory documentHash,
            string memory omegaId,
            string memory fileName,
            string memory documentType,
            uint256 timestamp,
            bool exists
        )
    {
        Document memory doc = documents[documentId];
        return (
            doc.documentHash,
            doc.omegaId,
            doc.fileName,
            doc.documentType,
            doc.timestamp,
            doc.exists
        );
    }
    
    /**
     * @notice Remove a document (only if you own it)
     * @param documentId The document ID to remove
     * @param omegaId Your Omega ID (for verification)
     */
    function removeDocument(
        string memory documentId,
        string memory omegaId
    ) external validDocumentId(documentId) {
        Document storage doc = documents[documentId];
        require(doc.exists, "Document does not exist");
        require(
            keccak256(bytes(doc.omegaId)) == keccak256(bytes(omegaId)),
            "You can only remove your own documents"
        );
        
        // Remove from array (find and remove)
        string[] storage docs = omegaDocuments[omegaId];
        for (uint256 i = 0; i < docs.length; i++) {
            if (keccak256(bytes(docs[i])) == keccak256(bytes(documentId))) {
                docs[i] = docs[docs.length - 1];
                docs.pop();
                break;
            }
        }
        
        // Delete document
        delete documents[documentId];
        
        emit DocumentRemoved(omegaId, documentId, block.timestamp);
    }
    
    /**
     * @notice Get document count for an Omega ID
     * @param omegaId The Omega ID to query
     * @return count Number of documents
     */
    function getDocumentCount(string memory omegaId)
        external
        view
        returns (uint256 count)
    {
        return omegaDocuments[omegaId].length;
    }
}

