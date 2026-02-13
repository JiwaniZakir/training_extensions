# Copyright (C) 2025 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

"""OTX instance segmentation performance benchmark."""

from __future__ import annotations

from pathlib import Path

from tests.perf_v2.utils import (
    Criterion,
    DatasetInfo,
    ModelInfo,
)

from otx.types.task import OTXTaskType

TASK_TYPE = OTXTaskType.INSTANCE_SEGMENTATION


MODEL_TEST_CASES = [
    ModelInfo(task=TASK_TYPE.value, name="maskrcnn_r50_tv", category="balance"),
    ModelInfo(task=TASK_TYPE.value, name="rfdetr_seg_medium", category="other"),
    ModelInfo(task=TASK_TYPE.value, name="rfdetr_seg_large", category="other"),
    ModelInfo(task=TASK_TYPE.value, name="rfdetr_seg_nano", category="other"),
    ModelInfo(task=TASK_TYPE.value, name="rfdetr_seg_small", category="other"),
    ModelInfo(task=TASK_TYPE.value, name="rfdetr_seg_xlarge", category="other"),
    ModelInfo(task=TASK_TYPE.value, name="rfdetr_seg_2xlarge", category="other"),
    ModelInfo(task=TASK_TYPE.value, name="maskrcnn_efficientnetb2b", category="speed"),
    ModelInfo(task=TASK_TYPE.value, name="maskrcnn_swint", category="accuracy"),
]

DATASET_TEST_CASES = (
    [
        DatasetInfo(
            name=f"blueberry_tiny_{idx}",
            path=Path("detection/blueberry_tiny") / f"{idx}",
            group="tiny",
        )
        for idx in (1, 2, 3)
    ] +
    [
        DatasetInfo(
            name="wgisd_coco",
            path=Path("detection/wgisd_merged_coco_small"),
            group="small",
        ),
        DatasetInfo(
            name="skindetect",
            path=Path("detection/skindetect-roboflow"),
            group="small",
        ),
        DatasetInfo(
            name="vitens_coliform",
            path=Path("detection/Vitens-Coliform-coco"),
            group="small",
        ),
        DatasetInfo(
            name="Chicken",
            path=Path("detection/chicken"),
            group="medium",
        ),
        DatasetInfo(
            name="cityscapes",
            path=Path("detection/cityscapes_coco_reduced"),
            group="large",
        ),
    ]
)

BENCHMARK_CRITERIA = [
    Criterion(name="training:epoch", summary="max", compare="<", margin=0.1),
    Criterion(name="training:e2e_time", summary="max", compare="<", margin=0.1),
    Criterion(name="training:gpu_mem", summary="max", compare="<", margin=0.1),
    Criterion(name="training:val/f1-score", summary="max", compare=">", margin=0.1),
    Criterion(name="torch:test/f1-score", summary="max", compare=">", margin=0.1),
    Criterion(name="export:test/f1-score", summary="max", compare=">", margin=0.1),
    Criterion(name="optimize:test/f1-score", summary="max", compare=">", margin=0.1),
    Criterion(name="training:train/iter_time", summary="mean", compare="<", margin=0.1),
    Criterion(name="torch:test/iter_time", summary="mean", compare="<", margin=0.1),
    Criterion(name="optimize:e2e_time", summary="mean", compare="<", margin=0.1),
    Criterion(name="torch:test/latency", summary="mean", compare="<", margin=0.1),
    Criterion(name="export:test/latency", summary="mean", compare="<", margin=0.1),
    Criterion(name="optimize:test/latency", summary="mean", compare="<", margin=0.1),
    Criterion(name="torch:test/e2e_time", summary="max", compare=">", margin=0.1),
    Criterion(name="export:test/e2e_time", summary="max", compare=">", margin=0.1),
    Criterion(name="optimize:test/e2e_time", summary="max", compare=">", margin=0.1),
]
