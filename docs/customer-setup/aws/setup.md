# AWS S3 BYO storage setup (Phase 17b)

Register a customer-owned S3 bucket and IAM role so the PGP Key Manager API can validate access via **STS AssumeRole** and a probe object (Put → Get → Delete). Keyring bytes remain inline in Postgres until Phase 17c.

## Prerequisites

- An S3 bucket in your AWS account (versioning recommended for Phase 17d lifecycle writes).
- The PGP Key Manager API deployed with an **IAM task/instance role** in the app AWS account (see [README](../../README.md) — production must not use static access keys).
- A storage connection created in **Settings** — copy the **External ID** and note the **prefix** (default `pgp-key-manager/`).

## Option A — CloudFormation (recommended)

From this directory:

```bash
aws cloudformation deploy \
  --stack-name pgp-key-manager-storage \
  --template-file cloudformation.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    AppRoleArn=arn:aws:iam::APP_ACCOUNT_ID:role/PgpKeyManagerAppRole \
    ExternalId=YOUR_CONNECTION_EXTERNAL_ID \
    BucketName=your-bucket-name \
    Prefix=pgp-key-manager/
```

Use the stack output **RoleArn** as the **IAM role ARN** when registering or editing the connection in Settings.

## Option B — Manual IAM policies

1. Create an IAM role in your account (e.g. `pgp-key-manager-storage`).
2. Attach a trust policy from [`trust-policy.json`](trust-policy.json):
   - Replace `APP_ACCOUNT_ID` and `PgpKeyManagerAppRole` with the app workload role ARN components.
   - Replace `CONNECTION_EXTERNAL_ID` with the External ID from Settings.
3. Attach an inline permission policy from [`permission-policy.json`](permission-policy.json):
   - Replace `CUSTOMER_BUCKET` and `PREFIX` (e.g. `pgp-key-manager/`).
4. Enter the role ARN, bucket, region, and prefix in Settings.

## App-side IAM (operator)

The API workload role in **your** (app) AWS account needs permission to call `sts:AssumeRole` on customer role ARNs. Example (broad; customer trust policies are the primary gate):

```json
{
  "Effect": "Allow",
  "Action": "sts:AssumeRole",
  "Resource": "arn:aws:iam::*:role/*"
}
```

**Production:** attach this to the ECS/EKS/EC2 task role via the default credential chain.

**Local dev:** optional `AWS_PROFILE` or `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — dev convenience only; do not use static keys in production.

## Verify

1. Open **Settings → Cloud storage connections**.
2. Select your connection and click **Test connection**.
3. Success writes a probe object under `{prefix}.pgp-key-manager-probe/{connectionId}/probe.json` and deletes it (SSE-S3). If delete fails after a successful upload, a harmless probe object may remain until the next successful test or manual cleanup.

## Optional KMS (Phase 17c+)

Phase 17b probe objects use **SSE-S3 (`AES256`)**. If you require SSE-KMS for keyrings in Phase 17c, add `kms:Encrypt`, `kms:Decrypt`, and `kms:GenerateDataKey` on your CMK to the customer role policy and document the CMK ARN on the connection when that field is added.

## Maintainer note

CloudFormation in this folder is the **customer-facing** artifact. Optional CDK Java under `infra/customer-setup/aws/cdk/` may be added later to synth this template in CI; customers do not run CDK.
