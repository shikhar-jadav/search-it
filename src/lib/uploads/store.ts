import BaseEmbedding from "../models/base/embedding";
import UploadManager from "./manager";
import computeSimilarity from "../utils/computeSimilarity";
import { computeBM25Score, reciprocalRankFusion } from "../utils/hybridSearch";
import { Chunk } from "../types";

type UploadStoreParams = {
    embeddingModel: BaseEmbedding<any>;
    fileIds: string[];
}

type StoreRecord = {
    embedding: number[];
    content: string;
    fileId: string;
    metadata: Record<string, any>
}

class UploadStore {
    embeddingModel: BaseEmbedding<any>;
    fileIds: string[];
    records: StoreRecord[] = [];

    constructor(private params: UploadStoreParams) {
        this.embeddingModel = params.embeddingModel;
        this.fileIds = params.fileIds;
        this.initializeStore();
    }

    initializeStore() {
        this.fileIds.forEach((fileId) => {
            const file = UploadManager.getFile(fileId);

            if (!file) {
                console.warn(`File with ID ${fileId} not found in uploads record.`);
                return;
            }

            const chunks = UploadManager.getFileChunks(fileId);

            this.records.push(...chunks.map((chunk) => ({
                embedding: chunk.embedding,
                content: chunk.content,
                fileId: fileId,
                metadata: {
                    fileName: file.name,
                    title: file.name,
                    url: `file_id://${file.id}`,
                }
            })));
        });
    }

    /**
     * Advanced Production RAG Hybrid Query:
     * Combines Dense Vector Search (Cosine Similarity) with Sparse Lexical Search (BM25)
     * using Reciprocal Rank Fusion (RRF).
     */
    async query(queries: string[], topK = 10): Promise<Chunk[]> {
        if (this.records.length === 0) return [];

        const allFusedChunks: Chunk[] = [];

        for (const query of queries) {
            // 1. Sparse BM25 Retrieval & Ranking
            const bm25Ranked: Chunk[] = this.records
                .map((record) => ({
                    chunk: {
                        content: record.content,
                        metadata: {
                            ...record.metadata,
                            fileId: record.fileId,
                        },
                    },
                    score: computeBM25Score(query, record.content),
                }))
                .filter((item) => item.score > 0)
                .sort((a, b) => b.score - a.score)
                .map((item) => item.chunk);

            // 2. Dense Vector Semantic Retrieval & Ranking
            let vectorRanked: Chunk[] = [];
            try {
                const queryEmbeddings = await this.embeddingModel.embedText([query]);
                if (queryEmbeddings.length > 0 && queryEmbeddings[0].length > 0) {
                    const queryVec = queryEmbeddings[0];
                    vectorRanked = this.records
                        .map((record) => ({
                            chunk: {
                                content: record.content,
                                metadata: {
                                    ...record.metadata,
                                    fileId: record.fileId,
                                },
                            },
                            score: computeSimilarity(queryVec, record.embedding),
                        }))
                        .sort((a, b) => b.score - a.score)
                        .map((item) => item.chunk);
                }
            } catch (err) {
                console.warn('Dense vector embedding error in UploadStore; falling back to lexical BM25:', err);
                vectorRanked = [];
            }

            // 3. Reciprocal Rank Fusion (RRF) between Dense and Sparse
            const fused = reciprocalRankFusion(vectorRanked, bm25Ranked, 60, topK);
            allFusedChunks.push(...fused);
        }

        // Deduplicate chunks across multi-query fan-out
        const seen = new Set<string>();
        const uniqueResults: Chunk[] = [];

        for (const chunk of allFusedChunks) {
            const key = `${chunk.metadata.fileId}:${chunk.content.slice(0, 100)}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueResults.push(chunk);
            }
        }

        return uniqueResults.slice(0, topK);
    }

    static getFileData(fileIds: string[]): { fileName: string; initialContent: string }[] {
        const filesData: { fileName: string; initialContent: string }[] = [];

        fileIds.forEach((fileId) => {
            const file = UploadManager.getFile(fileId);

            if (!file) {
                return;
            }

            const chunks = UploadManager.getFileChunks(fileId);

            filesData.push({
                fileName: file.name,
                initialContent: chunks.slice(0, 3).map(c => c.content).join('\n---\n'),
            });
        });

        return filesData;
    }
}

export default UploadStore;
