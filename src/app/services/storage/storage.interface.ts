export enum MIME_TYPE {
    IMAGE = 'image/*',
    JPG = 'image/jpeg',
    PNG = 'image/png',
    PDF = 'application/pdf',
    WORD_DOC = 'application/msword',
    WORD_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    EXCEL_XLS = 'application/vnd.ms-excel',
    EXCEL_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    PPT = 'application/vnd.ms-powerpoint',
    PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    CSV = 'text/csv',
    ZIP = 'application/zip',
    JSON = 'application/json',
    XML = 'application/xml',
    HTML = 'text/html',
    TEXT = 'text/plain',
    AUDIO = 'audio/*',
    VIDEO = 'video/*',
    DRAW_IO = 'application/octet-stream',
    GERBER = 'application/x-gerber',
    ANY = '*/*',
}

// Map MIME types to file extensions
export const MimeToExtension: Record<MIME_TYPE, string> = {
    [MIME_TYPE.GERBER]: 'gbr',
    [MIME_TYPE.IMAGE]: '*',
    [MIME_TYPE.JPG]: 'jpg',
    [MIME_TYPE.PNG]: 'png',
    [MIME_TYPE.PDF]: 'pdf',
    [MIME_TYPE.WORD_DOC]: 'doc',
    [MIME_TYPE.WORD_DOCX]: 'docx',
    [MIME_TYPE.EXCEL_XLS]: 'xls',
    [MIME_TYPE.EXCEL_XLSX]: 'xlsx',
    [MIME_TYPE.PPT]: 'ppt',
    [MIME_TYPE.PPTX]: 'pptx',
    [MIME_TYPE.CSV]: 'csv',
    [MIME_TYPE.ZIP]: 'zip',
    [MIME_TYPE.JSON]: 'json',
    [MIME_TYPE.XML]: 'xml',
    [MIME_TYPE.HTML]: 'html',
    [MIME_TYPE.TEXT]: 'txt',
    [MIME_TYPE.AUDIO]: '*',
    [MIME_TYPE.VIDEO]: '*',
    [MIME_TYPE.DRAW_IO]: '*',
    [MIME_TYPE.ANY]: '*',
};

export interface MinioClient {
    endPoint: string;
    port: number;
    accessKey: string;
    secretKey: string;
    useSSL?: boolean;
}

export interface MinioOptions extends MinioClient {
    bucketName: string;
    expiry?: number;
}
