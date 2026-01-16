export interface StorageUploadResult {
    url: string;
    key: string;
    bucket: string;
}

export interface IStorageService {
    uploadFile(file: Buffer, fileName: string, mimeType: string): Promise<StorageUploadResult>;
    deleteFile(key: string): Promise<void>;
    getSignedUrl(key: string): Promise<string>;
}
