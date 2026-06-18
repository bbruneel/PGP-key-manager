import type { StorageConnectionResponse } from "@/types/api"

import type { StorageConnectionFormValues } from "./storage-connection-form"

export function toFormValues(connection: StorageConnectionResponse): StorageConnectionFormValues {
  return {
    displayName: connection.displayName,
    region: connection.region,
    bucket: connection.bucket,
    prefix: connection.prefix === "pgp-key-manager/" ? "" : connection.prefix,
    roleArn: connection.roleArn,
  }
}
