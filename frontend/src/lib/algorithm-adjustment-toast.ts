import { toast } from "sonner"

import { algorithmFieldLabel, type AlgorithmFormValues } from "@/lib/algorithm-spec"

export function notifyAlgorithmAdjusted(
  previous: Pick<AlgorithmFormValues, "algorithm">,
  next: Pick<AlgorithmFormValues, "algorithm">,
): void {
  if (previous.algorithm === next.algorithm) {
    return
  }

  toast.info("Algorithm updated", {
    description: `Changed from ${algorithmFieldLabel(previous.algorithm)} to ${algorithmFieldLabel(next.algorithm)} to match your selection.`,
  })
}
