// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

import { fireEvent, screen } from '@testing-library/react';
import { render } from 'test-utils/render';

import { GalleryUploadDropZone } from './gallery-upload-drop-zone.component';

describe('GalleryUploadDropZone', () => {
    it('opens the file picker when the empty-state link is clicked', () => {
        const mockOnFilesSelected = vi.fn();

        render(<GalleryUploadDropZone isEmpty onFilesSelected={mockOnFilesSelected} />);

        const input = screen.getByLabelText(/Upload media files/i);
        const clickSpy = vi.spyOn(input, 'click');

        fireEvent.click(screen.getByText(/Your dataset is empty\. Upload your first media item to get started/i));

        expect(clickSpy).toHaveBeenCalled();
    });

    it('uploads dropped files from the empty state', () => {
        const mockOnFilesSelected = vi.fn();
        const mockFile = new File(['file content'], 'test-image.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
        });

        render(<GalleryUploadDropZone isEmpty onFilesSelected={mockOnFilesSelected} />);

        const dropZone = screen.getByTestId('dataset-media-drop-zone');

        fireEvent.dragEnter(dropZone, { dataTransfer: { files: [mockFile], types: ['Files'] } });
        fireEvent.drop(dropZone, { dataTransfer: { files: [mockFile], types: ['Files'] } });

        expect(mockOnFilesSelected).toHaveBeenCalledWith([mockFile]);
    });

    it('uploads dropped files when Windows-style drop data exposes files without the Files type', () => {
        const mockOnFilesSelected = vi.fn();
        const mockFile = new File(['file content'], 'test-image.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
        });

        render(<GalleryUploadDropZone isEmpty onFilesSelected={mockOnFilesSelected} />);

        const dropZone = screen.getByTestId('dataset-media-drop-zone');

        fireEvent.drop(dropZone, { dataTransfer: { files: [mockFile], types: [] } });

        expect(mockOnFilesSelected).toHaveBeenCalledWith([mockFile]);
    });

    it('shows drag-over state when dragged items are file items even without files populated yet', () => {
        const mockOnFilesSelected = vi.fn();

        render(<GalleryUploadDropZone isEmpty onFilesSelected={mockOnFilesSelected} />);

        const dropZone = screen.getByTestId('dataset-media-drop-zone');

        fireEvent.dragEnter(dropZone, { dataTransfer: { files: [], items: [{ kind: 'file' }], types: [] } });

        expect(dropZone.className).toMatch(/dragOver/);
    });
});
