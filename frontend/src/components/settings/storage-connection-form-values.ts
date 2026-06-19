import type { StorageConnectionFormValues } from "@/lib/storage-connection-validation"
import type { StorageConnectionResponse } from "@/types/api"

export function toFormValues(connection: StorageConnectionResponse): StorageConnectionFormValues {
  return {
    displayName: connection.displayName,
    region: connection.region,
    bucket: connection.bucket,
    prefix: connection.prefix === "pgp-key-manager/" ? "" : connection.prefix,
    roleArn: connection.roleArn,
  }
}
