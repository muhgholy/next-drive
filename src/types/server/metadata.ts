// ** Server Types - Metadata

// ** Image metadata extracted from file
export type TImageMetadata = {
    width: number;
    height: number;
    exif?: Record<string, unknown>;
};

// ** Video metadata extracted from file
export type TVideoMetadata = {
    width: number;
    height: number;
    duration: number;
};
