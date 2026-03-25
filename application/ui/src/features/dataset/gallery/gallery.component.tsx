// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

import { Checkbox, DialogContainer, Flex, Heading, Link, Size, Text, ViewModes } from '@geti/ui';
import { useProjectIdentifier } from 'hooks/use-project-identifier.hook';
import { isEmpty } from 'lodash-es';
import { GridLayoutOptions } from 'react-aria-components';

import { ReactComponent as EmptyDataset } from '../../../assets/empty-dataset.svg';
import { MediaItem } from '../../../components/media-item/media-item.component';
import { MediaThumbnail } from '../../../components/media-thumbnail/media-thumbnail.component';
import { VirtualizerGridLayout } from '../../../components/virtualizer-grid-layout/virtualizer-grid-layout.component';
import type { DatasetItemAnnotationStatus, Media } from '../../../constants/shared-types';
import { useGetDatasetItemsById } from '../../../hooks/use-get-dataset-items-by-id.hook';
import { getMediaBinaryUrl, getThumbnailUrl } from '../../../shared/media-url.utils';
import { MediaPreview } from '../media-preview/media-preview.component';
import { useSelectedData } from '../providers/selected-data-provider.component';
import { AnnotationStatusIcon } from './annotation-state-icon.component';
import { GalleryUploadDropZone } from './gallery-upload-drop-zone.component';
import { useSelectDatasetItem } from './hooks/use-select-dataset-item.hook';
import { MediaItemActions } from './media-item-actions/media-item-actions.component';

type GalleryProps = {
    items: Media[];
    annotationStatus?: DatasetItemAnnotationStatus;
    viewMode: ViewModes;
    isPending: boolean;
    hasActiveFilter: boolean;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
    onFilesSelected: (files: File[]) => void;
    isUploadDisabled?: boolean;
};

// DetailsView isn't needed, so we're forcing the cast to prevent TS from complaining about missing properties.
const VIEW_MODE_SETTINGS = {
    [ViewModes.LARGE]: { minItemSize: new Size(300, 300), minSpace: new Size(10, 10), preserveAspectRatio: true },
    [ViewModes.MEDIUM]: { minItemSize: new Size(200, 200), minSpace: new Size(6, 6), preserveAspectRatio: true },
    [ViewModes.SMALL]: { minItemSize: new Size(120, 120), minSpace: new Size(4, 4), preserveAspectRatio: true },
} as Record<ViewModes, GridLayoutOptions>;

export const Gallery = ({
    items,
    annotationStatus,
    viewMode,
    isPending,
    hasActiveFilter,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    onFilesSelected,
    isUploadDisabled = false,
}: GalleryProps) => {
    const projectId = useProjectIdentifier();
    const { selectedMediaItem, onSelectedMediaItemChange } = useSelectDatasetItem();
    const { selectedKeys, setSelectedKeys, toggleSelectedKeys } = useSelectedData();
    const { datasetItemsById } = useGetDatasetItemsById({ limit: items.length, annotationStatus });

    const isSetSelectedKeys = selectedKeys instanceof Set;

    if (!isPending && isEmpty(items)) {
        if (hasActiveFilter) {
            return (
                <Flex
                    direction={'column'}
                    gap={'size-200'}
                    alignItems={'center'}
                    justifyContent={'center'}
                    height={'100%'}
                >
                    <EmptyDataset />
                    <Heading level={2}>No media items match your filter. Remove or select a new filter.</Heading>
                </Flex>
            );
        }

        return (
            <GalleryUploadDropZone
                isEmpty
                isDisabled={isUploadDisabled}
                onFilesSelected={onFilesSelected}
                renderEmptyState={({ openFileDialog }) => (
                    <Flex
                        direction={'column'}
                        gap={'size-200'}
                        alignItems={'center'}
                        justifyContent={'center'}
                        height={'100%'}
                    >
                        <EmptyDataset />
                        <Heading level={2}>
                            <Link onPress={openFileDialog} UNSAFE_style={{ textDecoration: 'underline' }}>
                                Your dataset is empty. Upload your first media item to get started.
                            </Link>
                        </Heading>
                        <Text>You can also drag and drop media files here.</Text>
                    </Flex>
                )}
            />
        );
    }

    return (
        <>
            <GalleryUploadDropZone isDisabled={isUploadDisabled} onFilesSelected={onFilesSelected}>
                <VirtualizerGridLayout
                    items={items}
                    ariaLabel='data-collection-grid'
                    selectionMode='multiple'
                    selectedKeys={selectedKeys}
                    layoutOptions={VIEW_MODE_SETTINGS[viewMode]}
                    isLoadingMore={isFetchingNextPage}
                    onLoadMore={() => hasNextPage && fetchNextPage()}
                    onSelectionChange={setSelectedKeys}
                    contentItem={(item) => {
                        const mediaUrl = getThumbnailUrl(projectId, item.id);
                        const fullMediaUrl = getMediaBinaryUrl(projectId, item.id);
                        const mediaFileName = `${item.name}.${item.format}`;

                        return (
                            <MediaItem
                                contentElement={() => (
                                    <MediaThumbnail
                                        item={item}
                                        alt={item.name}
                                        url={mediaUrl}
                                        onDoubleClick={() => onSelectedMediaItemChange(item)}
                                    />
                                )}
                                topLeftElement={() => (
                                    <Flex
                                        width={'size-200'}
                                        height={'size-200'}
                                        alignItems={'center'}
                                        justifyContent={'center'}
                                    >
                                        <Checkbox
                                            aria-label={`Select media item ${item.name}`}
                                            onChange={() => toggleSelectedKeys([String(item.id)])}
                                            isSelected={isSetSelectedKeys && selectedKeys.has(String(item.id))}
                                        />
                                    </Flex>
                                )}
                                topRightElement={() => (
                                    <MediaItemActions
                                        id={item.id}
                                        onDeleted={toggleSelectedKeys}
                                        mediaUrl={fullMediaUrl}
                                        mediaFileName={mediaFileName}
                                        onAnnotate={() => onSelectedMediaItemChange(item)}
                                    />
                                )}
                                bottomRightElement={() => {
                                    const mediaItemId = String(item.id);
                                    const isUserReviewed = datasetItemsById.get(mediaItemId) ?? false;

                                    return <AnnotationStatusIcon state={isUserReviewed ? 'accepted' : undefined} />;
                                }}
                            />
                        );
                    }}
                />
            </GalleryUploadDropZone>

            <DialogContainer type={'fullscreenTakeover'} onDismiss={() => onSelectedMediaItemChange(null)}>
                {selectedMediaItem !== null && (
                    <MediaPreview
                        mediaItem={selectedMediaItem}
                        close={() => onSelectedMediaItemChange(null)}
                        onSelectedMediaItem={onSelectedMediaItemChange}
                    />
                )}
            </DialogContainer>
        </>
    );
};
