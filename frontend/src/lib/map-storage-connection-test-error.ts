import { formatStorageConnectionTestError } from "@/lib/storage-connection-test-error"

export type MappedStorageConnectionTestError = {
  message: string
}

export function mapStorageConnectionTestError(
  errorCategory: string | null | undefined,
  fallbackMessage?: string | null,
): MappedStorageConnectionTestError {
  return {
    message: formatStorageConnectionTestError(errorCategory, fallbackMessage),
  }
}
