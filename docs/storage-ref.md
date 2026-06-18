# Storage reference (`storage_ref`) contract

Phase 17a defines the URI format used on `pgp_keys.storage_ref` to point at externally stored keyring blobs. In Phase 17a, keyring bytes remain inline in Postgres; this contract is documented and validated only.

## Grammar

```
aws-s3://{connectionUuid}/{objectKey}[?versionId={s3VersionId}]
```

| Part | Description |
|------|-------------|
| `connectionUuid` | UUID of a row in `storage_connections` (resolves bucket, region, prefix, IAM role) |
| `objectKey` | Path relative to the connection prefix (URL-encoded segments allowed) |
| `versionId` | Optional S3 object version id (populated after lifecycle writes in Phase 17d) |

## Examples

```
aws-s3://550e8400-e29b-41d4-a716-446655440000/user/abc/keys/def/keyring.json
aws-s3://550e8400-e29b-41d4-a716-446655440000/user/abc/keys/def/keyring.json?versionId=abc123
```

## Object key layout (Phase 17c+)

When keys are written to customer S3, object keys follow:

```
{connection.prefix}{ownerType}/{ownerId}/keys/{primaryKeyId}/keyring.json
```

Example full S3 location:

```
s3://customer-bucket/pgp-key-manager/user/{userId}/keys/{primaryKeyId}/keyring.json
```

The bucket name is **not** embedded in `storage_ref`; it lives on the `storage_connections` row.

## Related fields

| Column / field | Value |
|----------------|-------|
| `storage_provider` | `aws-s3` |
| `storage_ref` | URI as above |

Until Phase 17c, `storage_provider` and `storage_ref` may be set manually via PATCH but do not change where keyring bytes are stored. When both fields are set, the API validates `storage_ref` against this URI contract via `StorageRefParser`.
