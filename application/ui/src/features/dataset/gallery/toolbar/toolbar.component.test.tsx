// Copyright (C) 2026 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

import { ViewModes } from '@geti/ui';
import { fireEvent, screen } from '@testing-library/react';
import { getMockedMediaImage } from 'mocks/mock-media';
import { render } from 'test-utils/render';

import type { Media } from '../../../../constants/shared-types';
import { SelectedDataProvider } from '../../providers/selected-data-provider.component';
import { Toolbar } from './toolbar.component';

const onFilesSelectedMock = vi.fn();
const onSelectedMediaItemChangeMock = vi.fn();

vi.mock('../hooks/use-select-dataset-item.hook', () => ({
    useSelectDatasetItem: () => ({
        onSelectedMediaItemChange: onSelectedMediaItemChangeMock,
        selectedMediaItem: null,
    }),
}));

vi.mock('../../../models/train-model/train-model.component', () => ({
    TrainModel: () => <div>Train model</div>,
}));

vi.mock('../../import-export/import-export.component', () => ({
    ImportExport: () => <div>ImportExport</div>,
}));

describe('Toolbar', () => {
    const renderToolbar = (items: Media[] = []) => {
        return render(
            <SelectedDataProvider>
                <Toolbar
                    items={items}
                    onFilesSelected={onFilesSelectedMock}
                    viewMode={ViewModes.LARGE}
                    setViewMode={vi.fn()}
                    onFilter={vi.fn()}
                />
            </SelectedDataProvider>
        );
    };

    beforeEach(() => {
        onFilesSelectedMock.mockClear();
        onSelectedMediaItemChangeMock.mockClear();
    });

    it('delegates selected files to the provided upload handler', () => {
        const file = new File(['file-content'], 'media-item.jpg', { type: 'image/jpeg' });

        renderToolbar();

        const input = screen.getByLabelText(/Upload media files/);
        fireEvent.change(input, { target: { files: [file] } });

        expect(onFilesSelectedMock).toHaveBeenCalledWith([file]);
    });

    it('shows total images count when no items are selected', () => {
        renderToolbar([getMockedMediaImage({ id: '1' }), getMockedMediaImage({ id: '2' })]);

        expect(screen.getByText('2 images')).toBeVisible();
    });

    it('disables annotate button when there are no items', () => {
        renderToolbar();

        expect(screen.getByRole('button', { name: 'Annotate' })).toBeDisabled();
    });

    it('calls onSelectedMediaItemChange with first item when annotate is clicked', () => {
        const firstItem = getMockedMediaImage({ id: 'first-item' });
        const secondItem = getMockedMediaImage({ id: 'second-item' });

        renderToolbar([firstItem, secondItem]);

        fireEvent.click(screen.getByRole('button', { name: 'Annotate' }));

        expect(onSelectedMediaItemChangeMock).toHaveBeenCalledWith(firstItem);
    });

    it('selects all items and updates selected count', () => {
        renderToolbar([getMockedMediaImage({ id: '1' }), getMockedMediaImage({ id: '2' })]);

        fireEvent.click(screen.getByLabelText('select all'));

        expect(screen.getByText('2 selected')).toBeVisible();
        expect(screen.getByLabelText(/delete media item/i)).toBeVisible();
    });
});
