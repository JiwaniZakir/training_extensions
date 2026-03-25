// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

import { Button } from '@geti/ui';

import { acceptedExtensions, useMediaFileSelection } from './use-media-file-selection.hook';

type AddMediaButtonProps = {
    onFilesSelected: (files: File[]) => void;
    isDisabled?: boolean;
    multiple?: boolean;
};

export { acceptedExtensions };

export const AddMediaButton = ({ onFilesSelected, isDisabled = false, multiple = true }: AddMediaButtonProps) => {
    const { inputRef, handleFileChange, openFileDialog } = useMediaFileSelection({ onFilesSelected });

    return (
        <>
            <input
                ref={inputRef}
                type='file'
                multiple={multiple}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                aria-label={'Upload media files'}
                accept={acceptedExtensions}
            />
            <Button variant={'secondary'} isDisabled={isDisabled} onPress={openFileDialog}>
                Upload media
            </Button>
        </>
    );
};
