// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';

import { useZoom } from '../../../../components/zoom/zoom';
import { Annotation, Point, RegionOfInterest } from '../../types';
import { ResizeAnchor } from './resize-anchor.component';
import { TranslateShape } from './translate-shape.component';
import { getBoundingBoxInRoi, getBoundingBoxResizePoints, getClampedBoundingBox } from './utils';

import classes from './bounding-box-tool.module.scss';

interface EditBoundingBoxProps {
    annotation: Annotation & { shape: { shapeType: 'rect' } };
    roi: RegionOfInterest;
    updateAnnotation: (annotation: Annotation) => void;
}

const ANCHOR_SIZE = 8;

export const EditBoundingBox = ({ annotation, roi, updateAnnotation }: EditBoundingBoxProps) => {
    const { scale } = useZoom();
    const [shape, setShape] = useState(annotation.shape);

    const onComplete = () => {
        updateAnnotation({ ...annotation, shape });
    };

    const translate = (point: Point) => {
        const newBoundingBox = getClampedBoundingBox(point, shape, roi);

        setShape({ ...shape, ...newBoundingBox });
    };

    const anchorPoints = getBoundingBoxResizePoints({
        gap: (2 * ANCHOR_SIZE) / scale,
        boundingBox: shape,
        onResized: (boundingBox) => {
            setShape({ ...shape, ...getBoundingBoxInRoi(boundingBox, roi) });
        },
    });

    return (
        <g style={{ zIndex: 2 }}>
            <TranslateShape
                zoom={scale}
                annotation={{ ...annotation, shape }}
                translateShape={translate}
                onComplete={onComplete}
            />

            <g style={{ pointerEvents: 'auto' }}>
                {anchorPoints.map((anchor) => {
                    return <ResizeAnchor key={anchor.label} zoom={scale} onComplete={onComplete} {...anchor} />;
                })}
            </g>
        </g>
    );
};
