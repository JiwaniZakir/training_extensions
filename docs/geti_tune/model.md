## Fine-tuning and model management

TODO

| Method  | Path                                         | Payload                          | Return           | Description                                  |
|---------|----------------------------------------------|----------------------------------|------------------|----------------------------------------------|
| `POST`  | `/api/tasks/<id>:train`                      | arch, hyperparams, base model id | model info       | Create a new model by fine-tuning            |
| `GET`   | `/api/tasks/<id>/models`                     | -                                | model list       | List all models groups created for a task    |
| `GET`   | `/api/tasks/<id>/models/<id>`                | -                                | model group info | Get information about a specific model group |
| `GET`   | `/api/tasks/<id>/models/<id>/revisions/<id>` | -                                | model info       | Get a specific revision of a model group     |
