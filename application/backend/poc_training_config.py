#  Copyright (C) 2026 Intel Corporation
#  SPDX-License-Identifier: Apache-2.0

from decimal import Decimal
from enum import StrEnum
from typing import Literal, Union

from pydantic import BaseModel, ConfigDict, Field
from pydantic.fields import FieldInfo
from pydantic_core import PydanticUndefined

type Scalar = Decimal | bool | bytearray | bytes | float | int | str

### INTERNAL MODELS


class BaseModelNoExtra(BaseModel):
    model_config = ConfigDict(extra="forbid")


class GaussianBlur(BaseModel):
    enable: bool = Field(title="Enable Gaussian blur")
    kernel_size: int = Field(gt=0, title="Kernel size for Gaussian blur")


class AugmentationParameters(BaseModel):
    gaussian_blur: GaussianBlur | None = Field(title="Gaussian blur", default=None)


class SubsetSplit(BaseModel):
    training: int = Field(ge=1, le=100, default=70, title="Training percentage")
    validation: int = Field(ge=1, le=100, default=20, title="Validation percentage")
    test: int = Field(ge=1, le=100, default=10, title="Test percentage")


class TaskLevelDatasetPreparationParameters(BaseModel):
    subset_split: SubsetSplit = Field(title="Subset split parameters")


class ModelLevelDatasetPreparationParameters(BaseModel):
    augmentation: AugmentationParameters = Field(title="Augmentation parameters")


class TrainingParameters(BaseModel):
    max_epochs: int | None = Field(gt=0, default=None, title="Maximum epochs")
    learning_rate: float = Field(gt=0, lt=1, title="Learning rate")


class TaskLevelParameters(BaseModel):
    dataset_preparation: TaskLevelDatasetPreparationParameters = Field(title="Dataset preparation parameters")


class ModelLevelParameters(BaseModel):
    dataset_preparation: ModelLevelDatasetPreparationParameters = Field(title="Dataset preparation parameters")
    training: TrainingParameters = Field(title="Training parameters")


class TrainingConfiguration(BaseModel):
    task_level_parameters: TaskLevelParameters = Field(
        title="Parameters configured at the task level (affect all model architectures)"
    )
    model_level_parameters: ModelLevelParameters = Field(
        title="Parameters configured at the model architecture level (affect only specific model architecture)"
    )


### PRESENTATION MODELS


class ConfigurableParameterViewElementType(StrEnum):
    PARAMETER = "parameter"
    PARAMETER_GROUP = "parameter_group"


class ConfigurableParameterView(BaseModel):
    type: Literal[ConfigurableParameterViewElementType.PARAMETER] = ConfigurableParameterViewElementType.PARAMETER
    key: str = Field(title="Key to identify the parameter")
    name: str = Field(title="User-friendly name of the parameter")
    description: str = Field(title="Extended description of the parameter", default="")
    value: bool | int | str | float | None = Field(title="Actual value of the parameter")
    default_value: bool | int | str | float | None = Field(title="Default value of the parameter")
    min_value: int | float | None = Field(default=None, title="Minimum value for numeric parameters")
    max_value: int | float | None = Field(default=None, title="Maximum value for numeric parameters")


class ConfigurableParameterGroupView(BaseModel):
    type: Literal[ConfigurableParameterViewElementType.PARAMETER_GROUP] = (
        ConfigurableParameterViewElementType.PARAMETER_GROUP
    )
    key: str = Field(title="Key to identify the parameter group")
    name: str = Field(title="User-friendly name of the parameter group")
    description: str = Field(title="Extended description of the parameter group", default="")
    parameters: list[Union[ConfigurableParameterView, "ConfigurableParameterGroupView"]] = Field(
        title="List of parameters in the group"
    )


class TrainingConfigurationView(BaseModel):
    parameters: list[ConfigurableParameterView | ConfigurableParameterGroupView] = Field(
        title="Training configuration parameters"
    )

    ### CONVERSION LOGIC

    @classmethod
    def _extract_constraints(cls, field_info: FieldInfo) -> tuple[float | None, float | None]:
        """Extract min/max constraints from field metadata."""
        min_value = None
        max_value = None

        if hasattr(field_info, "metadata"):
            for constraint in field_info.metadata:
                if hasattr(constraint, "ge"):
                    min_value = constraint.ge
                elif hasattr(constraint, "gt"):
                    min_value = constraint.gt
                if hasattr(constraint, "le"):
                    max_value = constraint.le
                elif hasattr(constraint, "lt"):
                    max_value = constraint.lt

        return min_value, max_value

    @classmethod
    def _field_to_configurable_parameter(
        cls, key: str, value: Scalar | None, field_info: FieldInfo
    ) -> ConfigurableParameterView:
        """Convert a single field to ConfigurableParameterView."""
        min_value, max_value = cls._extract_constraints(field_info)

        # Handle PydanticUndefined default values
        if field_info.default is PydanticUndefined:
            default_value = value
        else:
            default_value = field_info.default

        if field_info.title is None:
            raise ValueError(
                f"Field '{key}' is missing a title in its FieldInfo, "
                f"which is required to associate a user-friendly name to the parameter."
            )

        return ConfigurableParameterView(
            key=key,
            name=field_info.title,
            description=field_info.description or "",
            value=value,
            default_value=default_value,
            min_value=min_value,
            max_value=max_value,
        )

    @classmethod
    def _model_to_parameter_group(
        cls, key: str, model: BaseModel, field_info: FieldInfo
    ) -> ConfigurableParameterGroupView:
        """Convert a Pydantic model to a ConfigurableParameterGroupView with nested parameters."""
        parameters: list[ConfigurableParameterView | ConfigurableParameterGroupView] = []

        for field_name, child_field_info in type(model).model_fields.items():
            value = getattr(model, field_name)

            # Skip parameters with null values
            if value is None:
                continue

            if isinstance(value, BaseModel):
                # Nested model -> create a nested parameter group
                nested_group = cls._model_to_parameter_group(field_name, value, child_field_info)
                # Only add the group if it has parameters (not empty due to null filtering)
                if nested_group.parameters:
                    parameters.append(nested_group)
            else:
                # Scalar value -> create a parameter
                parameters.append(cls._field_to_configurable_parameter(field_name, value, child_field_info))

        if field_info.title is None:
            raise ValueError(
                f"Field '{key}' is missing a title in its FieldInfo, "
                f"which is required to associate a user-friendly name to the parameter group."
            )

        return ConfigurableParameterGroupView(
            key=key,
            name=field_info.title,
            description=field_info.description if field_info.description else "",
            parameters=parameters,
        )

    @classmethod
    def _merge_parameter_groups(cls, *groups: ConfigurableParameterGroupView) -> ConfigurableParameterGroupView:
        """Merge multiple parameter groups with the same key into one."""
        if not groups:
            raise ValueError("At least one group is required")

        # Use the first group as base
        base = groups[0]
        merged_parameters: list[ConfigurableParameterView | ConfigurableParameterGroupView] = []

        # Collect all parameters by key for merging
        params_by_key: dict[str, list[ConfigurableParameterView | ConfigurableParameterGroupView]] = {}
        for group in groups:
            for param in group.parameters:
                if param.key not in params_by_key:
                    params_by_key[param.key] = []
                params_by_key[param.key].append(param)

        # Merge parameters with same key, or just add unique ones
        for key, params in params_by_key.items():
            if len(params) == 1:
                merged_parameters.append(params[0])
            # Multiple params with same key - they should all be groups to merge
            elif all(isinstance(p, ConfigurableParameterGroupView) for p in params):
                merged_parameters.append(cls._merge_parameter_groups(*params))  # type: ignore
            else:
                # If not all groups, just take the first one
                merged_parameters.append(params[0])

        return ConfigurableParameterGroupView(
            key=base.key,
            name=base.name,
            description=base.description,
            parameters=merged_parameters,
        )

    @classmethod
    def from_training_configuration(cls, config: TrainingConfiguration) -> "TrainingConfigurationView":
        """Convert TrainingConfiguration to TrainingConfigurationView."""

        # Convert task-level dataset_preparation to a parameter group
        task_dataset_prep = cls._model_to_parameter_group(
            "dataset_preparation",
            config.task_level_parameters.dataset_preparation,
            type(config.task_level_parameters).model_fields["dataset_preparation"],
        )

        # Convert model-level dataset_preparation to a parameter group
        model_dataset_prep = cls._model_to_parameter_group(
            "dataset_preparation",
            config.model_level_parameters.dataset_preparation,
            type(config.model_level_parameters).model_fields["dataset_preparation"],
        )

        # Merge both dataset_preparation groups
        merged_dataset_prep = cls._merge_parameter_groups(task_dataset_prep, model_dataset_prep)

        # Convert training parameters to a parameter group
        training_group = cls._model_to_parameter_group(
            "training",
            config.model_level_parameters.training,
            type(config.model_level_parameters).model_fields["training"],
        )

        # Return with direct list of parameter groups
        return cls(parameters=[merged_dataset_prep, training_group])

    ### UPDATE LOGIC

    @classmethod
    def _resolve_parameter_path(cls, config: TrainingConfiguration, path: str) -> tuple[BaseModel, str]:
        """
        Resolve a dot-notation path to find the parent object and field name.

        Returns a tuple of (parent_object, field_name) where the field should be updated.
        Raises ValueError if the path cannot be resolved.
        """
        parts = path.split(".")
        if len(parts) < 2:
            raise ValueError(f"Invalid path '{path}': must contain at least one dot separator")

        # The path starts with a top-level section (e.g., "dataset_preparation", "training")
        # We need to find which parameter level contains this section
        top_section = parts[0]

        # Determine which parameter level(s) to search
        task_level = config.task_level_parameters
        model_level = config.model_level_parameters

        # Try to find the path in task-level or model-level parameters
        current_obj: BaseModel | None = None
        remaining_parts = parts[1:]

        # Check if top_section exists in task_level_parameters
        if hasattr(task_level, top_section):
            task_section = getattr(task_level, top_section)
            resolved = cls._try_resolve_path(task_section, remaining_parts)
            if resolved is not None:
                current_obj, field_name = resolved
                return current_obj, field_name

        # Check if top_section exists in model_level_parameters
        if hasattr(model_level, top_section):
            model_section = getattr(model_level, top_section)
            resolved = cls._try_resolve_path(model_section, remaining_parts)
            if resolved is not None:
                current_obj, field_name = resolved
                return current_obj, field_name

        raise ValueError(f"Cannot resolve path '{path}': path not found in configuration")

    @classmethod
    def _try_resolve_path(cls, obj: BaseModel, path_parts: list[str]) -> tuple[BaseModel, str] | None:
        """
        Try to resolve remaining path parts starting from obj.

        Returns (parent_object, field_name) if successful, None otherwise.
        """
        if not path_parts:
            return None

        current = obj
        for i, part in enumerate(path_parts[:-1]):
            if not hasattr(current, part):
                return None
            next_obj = getattr(current, part)
            if not isinstance(next_obj, BaseModel):
                return None
            current = next_obj

        # Check if the final field exists
        final_field = path_parts[-1]
        if not hasattr(current, final_field):
            return None

        # Verify the field exists in the model's fields
        if final_field not in type(current).model_fields:
            return None

        return current, final_field

    @classmethod
    def apply_updates(cls, config: TrainingConfiguration, updates: dict[str, Scalar]) -> TrainingConfiguration:
        """
        Apply a dictionary of updates to a TrainingConfiguration object.

        Args:
            config: The existing TrainingConfiguration to update
            updates: Dictionary with dot-notation keys and new values

        Returns:
            A new TrainingConfiguration with the updates applied

        Raises:
            ValueError: If any key in updates cannot be resolved
        """
        # First, validate all paths exist before applying any updates
        resolved_updates: list[tuple[BaseModel, str, Scalar]] = []
        for path, value in updates.items():
            parent_obj, field_name = cls._resolve_parameter_path(config, path)
            resolved_updates.append((parent_obj, field_name, value))

        # Apply all updates (modifies in place)
        for parent_obj, field_name, value in resolved_updates:
            setattr(parent_obj, field_name, value)

        return config


### POC (Retrieval workflow, from DB format to internal data model to presentation model for frontend)

# Example of data stored in the database for a model architecture
DB_MODEL_LEVEL_CONFIG = {
    "dataset_preparation": {
        "augmentation": {
            "gaussian_blur": {
                "enable": True,
                "kernel_size": 5,
            }
        }
    },
    "training": {
        "max_epochs": 50,
        "learning_rate": 0.001,
    },
}

# Example of data stored in the database for a task
DB_TASK_LEVEL_CONFIG = {
    "dataset_preparation": {
        "subset_split": {
            "training": 80,
            "validation": 15,
            "test": 5,
        }
    }
}

# Read from database to internal data model
training_configuration = TrainingConfiguration(
    task_level_parameters=TaskLevelParameters.model_validate(DB_TASK_LEVEL_CONFIG),
    model_level_parameters=ModelLevelParameters.model_validate(DB_MODEL_LEVEL_CONFIG),
)
training_configuration_json = training_configuration.model_dump_json()
print(
    f"From DB format to internal data model\n"
    "================================\n"
    f"{training_configuration_json}\n"
    "================================"
)

# Convert internal data model to presentation model for frontend
training_configuration_view = TrainingConfigurationView.from_training_configuration(training_configuration)
training_configuration_view_json = training_configuration_view.model_dump_json(indent=2)
print(
    f"From internal data model to presentation model for frontend\n"
    "================================\n"
    f"{training_configuration_view_json}\n"
    "================================"
)


### POC (Update workflow, from frontend input to internal data model to DB format)

UPDATE_REQUEST: dict[str, Scalar] = {
    "dataset_preparation.subset_split.training": 65,
    "dataset_preparation.subset_split.validation": 30,
    "training.max_epochs": 123,
}

# Apply updates to the existing configuration
updated_configuration = TrainingConfigurationView.apply_updates(training_configuration, UPDATE_REQUEST)
updated_configuration_json = updated_configuration.model_dump_json(indent=2)
print(
    f"After applying updates\n"
    "================================\n"
    f"{updated_configuration_json}\n"
    "================================"
)

# Verify by converting back to view
updated_view = TrainingConfigurationView.from_training_configuration(updated_configuration)
updated_view_json = updated_view.model_dump_json(indent=2)
print(
    f"Updated configuration as view\n"
    "================================\n"
    f"{updated_view_json}\n"
    "================================"
)

# Example of an invalid update (should raise an error)
INVALID_UPDATE_REQUEST: dict[str, Scalar] = {
    "dataset_preparation.nonexistent_field": 100,
}

try:
    TrainingConfigurationView.apply_updates(training_configuration, INVALID_UPDATE_REQUEST)
except ValueError as e:
    print(f"Expected error for invalid path: {e}")
