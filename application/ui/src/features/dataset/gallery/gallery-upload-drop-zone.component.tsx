// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

import { ReactNode } from 'react';

import { Flex, Link, Text } from '@geti/ui';
import classNames from 'clsx';

import { ReactComponent as UploadFolderIcon } from '../../../assets/icons/folder-arrow-right.svg';
import {
    acceptedExtensions,
    useMediaFileSelection,
} from '../../../components/add-media-button/use-media-file-selection.hook';

import classes from './gallery-upload-drop-zone.module.scss';

interface GalleryUploadDropZoneProps {
    children?: ReactNode;
    isDisabled?: boolean;
    isEmpty?: boolean;
    onFilesSelected: (files: File[]) => void;
    renderEmptyState?: (props: { openFileDialog: () => void }) => ReactNode;
}

export const GalleryUploadDropZone = ({
    children,
    isDisabled = false,
    isEmpty = false,
    onFilesSelected,
    renderEmptyState,
}: GalleryUploadDropZoneProps) => {
    const {
        inputRef,
        isDragOver,
        handleFileChange,
        openFileDialog,
        handleDragEnter,
        handleDragOver,
        handleDragLeave,
        handleDrop,
    } = useMediaFileSelection({ onFilesSelected });

    const handleOpenFileDialog = () => {
        if (!isDisabled) {
            openFileDialog();
        }
    };

    return (
        <>
            <input
                ref={inputRef}
                type='file'
                multiple
                disabled={isDisabled}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                aria-label={'Upload media files'}
                accept={acceptedExtensions}
            />

            <div
                data-testid={'dataset-media-drop-zone'}
                className={classNames(classes.dropZone, {
                    [classes.emptyState]: isEmpty,
                    [classes.dragOver]: !isDisabled && isDragOver,
                    [classes.disabled]: isDisabled,
                })}
                onDragEnter={isDisabled ? undefined : handleDragEnter}
                onDragOver={isDisabled ? undefined : handleDragOver}
                onDragLeave={isDisabled ? undefined : handleDragLeave}
                onDrop={isDisabled ? undefined : handleDrop}
            >
                {isEmpty ? (
                    (renderEmptyState?.({ openFileDialog: handleOpenFileDialog }) ?? (
                        <Flex
                            alignItems={'center'}
                            justifyContent={'center'}
                            direction={'column'}
                            gap={'size-200'}
                            UNSAFE_className={classes.emptyStateContent}
                        >
                            <div className={classes.emptyStateIcon} aria-hidden={'true'}>
                                <UploadFolderIcon />
                            </div>

                            <Link
                                onPress={handleOpenFileDialog}
                                UNSAFE_className={classes.emptyStateLink}
                                UNSAFE_style={{ textDecoration: 'underline' }}
                            >
                                Your dataset is empty. Upload your first media item to get started
                            </Link>

                            <Text UNSAFE_className={classes.emptyStateHint}>
                                You can also drag and drop media files here.
                            </Text>
                        </Flex>
                    ))
                ) : (
                    <>
                        {children}

                        {!isDisabled && isDragOver && (
                            <Flex
                                alignItems={'center'}
                                justifyContent={'center'}
                                direction={'column'}
                                gap={'size-100'}
                                UNSAFE_className={classes.dragOverlay}
                            >
                                <Text UNSAFE_className={classes.dragOverlayTitle}>Drop media files to upload</Text>
                                <Text UNSAFE_className={classes.dragOverlayHint}>Images and videos are supported.</Text>
                            </Flex>
                        )}
                    </>
                )}
            </div>
        </>
    );
};
