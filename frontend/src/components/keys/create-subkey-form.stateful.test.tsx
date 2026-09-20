import { useState } from "react"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import { CreateSubkeyForm } from "@/components/keys/create-subkey-form"
import {
  defaultCreateSubkeyFormValues,
  type CreateSubkeyFormValues,
} from "@/lib/create-subkey-validation"

function StatefulCreateSubkeyForm() {
  const [values, setValues] = useState<CreateSubkeyFormValues>(defaultCreateSubkeyFormValues)
  return (
    <CreateSubkeyForm
      values={values}
      fieldErrors={{}}
      apiError={null}
      requestId={null}
      submitting={false}
      disabled={false}
      primaryOpenpgpVersion={4}
      onChange={setValues}
      onSubmit={() => {}}
    />
  )
}

describe("CreateSubkeyForm capability toggles (controlled)", () => {
  afterEach(() => {
    cleanup()
  })

  it("checks authenticate and clears encrypt (mutual exclusivity)", async () => {
    const user = userEvent.setup()
    render(<StatefulCreateSubkeyForm />)

    expect(screen.getByLabelText("encrypt")).toBeChecked()
    await user.click(screen.getByLabelText("authenticate"))

    expect(screen.getByLabelText("authenticate")).toBeChecked()
    expect(screen.getByLabelText("encrypt")).not.toBeChecked()
    expect(screen.getByLabelText("sign")).not.toBeChecked()
  })

  it("checks and unchecks sign while encrypt remains", async () => {
    const user = userEvent.setup()
    render(<StatefulCreateSubkeyForm />)

    await user.click(screen.getByLabelText("sign"))
    expect(screen.getByLabelText("sign")).toBeChecked()
    expect(screen.getByLabelText("encrypt")).toBeChecked()

    await user.click(screen.getByLabelText("sign"))
    expect(screen.getByLabelText("sign")).not.toBeChecked()
    expect(screen.getByLabelText("encrypt")).toBeChecked()
  })

  it("unchecks encrypt when sign is also selected", async () => {
    const user = userEvent.setup()
    render(<StatefulCreateSubkeyForm />)

    await user.click(screen.getByLabelText("sign"))
    await user.click(screen.getByLabelText("encrypt"))

    expect(screen.getByLabelText("encrypt")).not.toBeChecked()
    expect(screen.getByLabelText("sign")).toBeChecked()
  })

  it("keeps encrypt checked when it is the only capability", async () => {
    const user = userEvent.setup()
    render(<StatefulCreateSubkeyForm />)

    await user.click(screen.getByLabelText("encrypt"))
    expect(screen.getByLabelText("encrypt")).toBeChecked()
  })
})
