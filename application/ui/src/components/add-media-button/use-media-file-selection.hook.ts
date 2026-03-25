// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

import { ChangeEvent, DragEvent, useCallback, useRef, useState } from 'react';

interface UseMediaFileSelectionOptions {
    onFilesSelected: (files: File[]) => void;
}

const VALID_VIDEO_EXT = ['mp4', 'avi', 'mkv', 'mov', 'webm', 'm4v'];
const VALID_IMAGE_EXT = ['jpg', 'jpeg', 'png', 'jfif', 'tif', 'tiff', 'webp', 'bmp'];
const VALID_EXT = [...VALID_VIDEO_EXT, ...VALID_IMAGE_EXT];

export const acceptedExtensions = VALID_EXT.map((ext) => `.${ext}`).join(',');

const getFileExtension = (fileName: string) => fileName.split('.').at(-1)?.toLowerCase();

const getAcceptedFiles = (files: FileList | null) => {
    if (files === null) {
        return [];
    }

    return Array.from(files).filter((file) => {
        const extension = getFileExtension(file.name);
        return extension !== undefined && VALID_EXT.includes(extension);
    });
};

const hasDraggedFiles = (event: DragEvent<HTMLElement>) => {
    const { dataTransfer } = event;

    if (dataTransfer.files.length > 0) {
        return true;
    }

    if (Array.from(dataTransfer.items).some((item) => item.kind === 'file')) {
        return true;
    }

    return Array.from(dataTransfer.types).includes('Files');
};

export const useMediaFileSelection = ({ onFilesSelected }: UseMediaFileSelectionOptions) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const dragDepthRef = useRef(0);
    const [isDragOver, setIsDragOver] = useState(false);

    const notifySelectedFiles = useCallback(
        (files: FileList | null) => {
            const acceptedFiles = getAcceptedFiles(files);

            if (acceptedFiles.length > 0) {
                onFilesSelected(acceptedFiles);
            }
        },
        [onFilesSelected]
    );

    const handleFileChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            notifySelectedFiles(event.target.files);

            // Clear the input value to allow selecting the same file again.
            event.target.value = '';
        },
        [notifySelectedFiles]
    );

    const openFileDialog = useCallback(() => {
        inputRef.current?.click();
    }, []);

    const handleDragEnter = useCallback((event: DragEvent<HTMLElement>) => {
        if (!hasDraggedFiles(event)) {
            return;
        }

        event.preventDefault();
        dragDepthRef.current += 1;
        setIsDragOver(true);
    }, []);

    const handleDragOver = useCallback((event: DragEvent<HTMLElement>) => {
        if (!hasDraggedFiles(event)) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }, []);

    const handleDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
        if (!hasDraggedFiles(event)) {
            return;
        }

        event.preventDefault();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

        if (dragDepthRef.current === 0) {
            setIsDragOver(false);
        }
    }, []);

    const handleDrop = useCallback(
        (event: DragEvent<HTMLElement>) => {
            event.preventDefault();
            dragDepthRef.current = 0;
            setIsDragOver(false);

            if (!hasDraggedFiles(event)) {
                return;
            }

            notifySelectedFiles(event.dataTransfer.files);
        },
        [notifySelectedFiles]
    );

    return {
        inputRef,
        isDragOver,
        handleFileChange,
        openFileDialog,
        handleDragEnter,
        handleDragOver,
        handleDragLeave,
        handleDrop,
    };
};
