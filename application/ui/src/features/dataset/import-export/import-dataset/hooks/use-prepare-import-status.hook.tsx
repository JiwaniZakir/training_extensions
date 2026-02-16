// Copyright (C) 2026 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from 'react';

import { toast } from '@geti/ui';
import { isEmpty, isError, isFunction } from 'lodash-es';

import { $api } from '../../../../../api/client';
import { PrepareImportDatasetJob } from '../../../../../constants/shared-types';
import { usePrepareImportDataset } from '../../../../../hooks/localStorage/use-prepare-import-dataset.hook';
import { isInvalidJob, isJobDone, isJobFailed } from '../../util';

type UsePrepareImportStatusProps = {
    onError?: () => void;
};

export const usePrepareImportStatus = ({ onError }: UsePrepareImportStatusProps) => {
    const { getLsPreparingImport, removeLsPreparingImport } = usePrepareImportDataset();
    const { id: jobId, fileName, size } = getLsPreparingImport() ?? {};

    /*     const response = {
        isError: false,
        isFetching: false,
        error: { detail: '' },
        data: {
            job_id: '6a57726a-ffe0-49df-acfa-897aca3264b3',
            job_type: 'prepare_dataset_for_import',
            metadata: {
                staged_dataset_id: 'af266078-bca0-41f6-b28b-97a034947d2f',
                project_id: null,
                filters: null,
                labels_mapping: null,
                subset_mapping: null,
                project: null,
            },
            status: 'DONE',
            progress: 100,
            message: 'Completed: Clean up original archive',
            error: null,
            started_at: '2026-02-19T15:24:16.721821Z',
            finished_at: '2026-02-19T15:24:16.744428Z',
        } as PrepareImportDatasetJob,
    };
 */

    const response = $api.useQuery(
        'get',
        '/api/jobs/{job_id}',
        { params: { path: { job_id: jobId } } },
        {
            enabled: !isEmpty(jobId),
            select: (currentData) => currentData as PrepareImportDatasetJob,
            refetchInterval: ({ state }) => {
                return isJobDone(state.data) || isJobFailed(state.data) || state.status === 'error' ? false : 1_000;
            },
        }
    );
    useEffect(() => {
        if (response.isError && isInvalidJob(response.error)) {
            isFunction(onError) && onError();
            removeLsPreparingImport();
            toast({ type: 'error', message: `Failed to prepare dataset for import. ${response.error?.detail}` });
        }
    }, [onError, removeLsPreparingImport, response.error, response.isError]);

    useEffect(() => {
        if (isJobFailed(response.data)) {
            isFunction(onError) && onError();
            toast({ type: 'error', message: `Failed to prepare dataset for import. ${response.data?.message}` });
        }
    }, [onError, response.data]);

    return { ...response, fileName, size };
};
