// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

import { ReactNode } from 'react';

import { useAnnotator } from '../annotator-provider.component';
import { useSelectedAnnotations } from '../select-annotation-provider.component';
import { EditBoundingBox } from '../tools/bounding-box-tool/bounding-box-tool.component';
import { Annotation } from '../types';
import { useAnnotation } from './annotation.component';

import classes from './edit-annotation.module.scss';

interface EditAnnotationProps {
    children: ReactNode;
}

export const EditAnnotation = ({ children }: EditAnnotationProps) => {
    const annotation = useAnnotation();
    const { selectedAnnotations } = useSelectedAnnotations();
    const { updateAnnotation } = useAnnotator();

    // Don't render the annotation if it's currently selected (being edited)
    const isSelected = selectedAnnotations?.has(annotation.id);

    if (isSelected && selectedAnnotations?.size !== 0) {
        if (annotation.shape.shapeType === 'rect') {
            const { shape } = annotation;
            const width = 300;
            const height = 300;

            return (
                <g
                    style={{
                        zIndex: 2,
                        position: 'relative',
                        fillOpacity: 1.0,
                        pointerEvents: 'all',
                    }}
                >
                    <EditBoundingBox
                        key={`bbox-${shape.x}-${shape.y}-${shape.width}-${shape.height}`}
                        annotation={annotation as Annotation & { shape: { shapeType: 'rect' } }}
                        roi={{ x: 0, y: 0, width, height }}
                        updateAnnotation={updateAnnotation}
                    />
                </g>
            );
        }
    }

    return <g style={{ zIndex: 1, position: 'relative', pointerEvents: 'visibleFill' }}>{children}</g>;
};
