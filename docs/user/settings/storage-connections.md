# Storage connections

Register **personal** AWS S3 connection metadata under **Settings** (`/settings`). This is the Phase **17a** connection registry only — keyring bytes still live inline in Postgres (no S3/STS I/O yet).

![Settings S3 connection](/assets/screenshots/settings-s3-connection.svg)

*Screenshot placeholder: Settings → Add AWS S3 connection form and connection detail (external ID).*

## What you configure

- Connection name, bucket, region, optional prefix
- IAM role ARN
- Server-generated **external ID** (for IAM trust policies in later phases)

## What this does *not* do yet

- Does not upload or download keyring blobs
- Does not assume the IAM role
- `storage_provider` / `storage_ref` on keys may be set for future use; see the [storage_ref URI contract](/develop/storage-ref)

## See also

- [Getting started](../getting-started)
- [Developer storage-ref](/develop/storage-ref)
