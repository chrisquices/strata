export type DropzoneState = {
    files: File[];
    count: number;
    totalSize: number;
};

export type DropzoneMessage = {
    id: string;
    message: string;
    files: File[];
};

export type DropzoneInstance = {
    getState(): DropzoneState;
    destroy(): void;
};
