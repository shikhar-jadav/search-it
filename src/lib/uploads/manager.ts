import path from "path";
import BaseEmbedding from "../models/base/embedding"
import crypto from "crypto"
import fs from 'fs';
import { splitText } from "../utils/splitText";
import { PDFParse } from 'pdf-parse';
import { CanvasFactory } from 'pdf-parse/worker';
import officeParser from 'officeparser'

export const supportedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'text/javascript',
    'application/javascript',
    'text/typescript',
    'text/x-python',
    'text/html'
] as const;

export const supportedExtensions = [
    '.pdf', '.docx', '.txt', '.md', '.markdown', '.csv', '.json',
    '.js', '.jsx', '.ts', '.tsx', '.py', '.html', '.css', '.yaml', '.yml'
];

type SupportedMimeType = typeof supportedMimeTypes[number];

type UploadManagerParams = {
    embeddingModel: BaseEmbedding<any>;
}

type RecordedFile = {
    id: string;
    name: string;
    filePath: string;
    contentPath: string;
    uploadedAt: string;
}

type FileRes = {
    fileName: string;
    fileExtension: string;
    fileId: string;
}

class UploadManager {
    private embeddingModel: BaseEmbedding<any>;
    static uploadsDir = path.join(process.cwd(), 'data', 'uploads');
    static uploadedFilesRecordPath = path.join(this.uploadsDir, 'uploaded_files.json');

    constructor(private params: UploadManagerParams) {
        this.embeddingModel = params.embeddingModel;

        if (!fs.existsSync(UploadManager.uploadsDir)) {
            fs.mkdirSync(UploadManager.uploadsDir, { recursive: true });
        }

        if (!fs.existsSync(UploadManager.uploadedFilesRecordPath)) {
            const data = {
                files: []
            }

            fs.writeFileSync(UploadManager.uploadedFilesRecordPath, JSON.stringify(data, null, 2));
        }
    }

    private static getRecordedFiles(): RecordedFile[] {
        const data = fs.readFileSync(UploadManager.uploadedFilesRecordPath, 'utf-8');
        return JSON.parse(data).files;
    }

    private static addNewRecordedFile(fileRecord: RecordedFile) {
        const currentData = this.getRecordedFiles()

        currentData.push(fileRecord);

        fs.writeFileSync(UploadManager.uploadedFilesRecordPath, JSON.stringify({ files: currentData }, null, 2));
    }

    static getFile(fileId: string): RecordedFile | null {
        const recordedFiles = this.getRecordedFiles();

        return recordedFiles.find(f => f.id === fileId) || null;
    }

    static getFileChunks(fileId: string): { content: string; embedding: number[] }[] {
        try {
            const recordedFile = this.getFile(fileId);

            if (!recordedFile) {
                throw new Error(`File with ID ${fileId} not found`);
            }

            const contentData = JSON.parse(fs.readFileSync(recordedFile.contentPath, 'utf-8'))

            return contentData.chunks;
        } catch (err) {
            console.log('Error getting file chunks:', err);
            return [];
        }
    }

    private async extractContentAndEmbed(filePath: string, fileType: string, fileExtension: string): Promise<string> {
        let rawText = '';

        if (fileType === 'application/pdf' || fileExtension === 'pdf') {
            const pdfBuffer = fs.readFileSync(filePath);
            const parser = new PDFParse({
                data: pdfBuffer,
                CanvasFactory
            });
            rawText = await parser.getText().then(res => res.text);
        } else if (
            fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            fileExtension === 'docx'
        ) {
            const docBuffer = fs.readFileSync(filePath);
            rawText = (await officeParser.parseOffice(docBuffer)).toText();
        } else {
            // Text, Markdown, CSV, JSON, Source Code files (.py, .ts, .js, .html, .yaml, etc.)
            rawText = fs.readFileSync(filePath, 'utf-8');
        }

        const splittedText = splitText(rawText, 512, 128);
        let embeddings: number[][] = [];

        try {
            embeddings = await this.embeddingModel.embedText(splittedText);
        } catch (err) {
            console.warn('Embedding generation failed during file upload, creating placeholder zero vectors:', err);
            embeddings = splittedText.map(() => []);
        }

        const contentPath = filePath.split('.').slice(0, -1).join('.') + '.content.json';

        const data = {
            chunks: splittedText.map((text, i) => ({
                content: text,
                embedding: embeddings[i] || [],
            }))
        };

        fs.writeFileSync(contentPath, JSON.stringify(data, null, 2));
        return contentPath;
    }

    async processFiles(files: File[]): Promise<FileRes[]> {
        const processedFiles: FileRes[] = [];

        await Promise.all(files.map(async (file) => {
            const fileExtension = (file.name.split('.').pop() || '').toLowerCase();
            const extWithDot = `.${fileExtension}`;

            const isSupported =
                (supportedMimeTypes as readonly string[]).includes(file.type) ||
                supportedExtensions.includes(extWithDot) ||
                file.type.startsWith('text/');

            if (!isSupported) {
                throw new Error(`File type "${file.type || fileExtension}" is not supported`);
            }

            const fileId = crypto.randomBytes(16).toString('hex');
            const fileName = `${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;
            const filePath = path.join(UploadManager.uploadsDir, fileName);

            const buffer = Buffer.from(await file.arrayBuffer());
            fs.writeFileSync(filePath, buffer);

            const contentFilePath = await this.extractContentAndEmbed(filePath, file.type, fileExtension);

            const fileRecord: RecordedFile = {
                id: fileId,
                name: file.name,
                filePath: filePath,
                contentPath: contentFilePath,
                uploadedAt: new Date().toISOString(),
            };

            UploadManager.addNewRecordedFile(fileRecord);

            processedFiles.push({
                fileExtension: fileExtension || '',
                fileId,
                fileName: file.name
            });
        }));

        return processedFiles;
    }
}

export default UploadManager;
