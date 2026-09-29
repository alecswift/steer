// Display formatting in imperial units (FR-010), shared by the peak and
// route panels.

const wholeNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

// 5781 → { value: "5,781", unit: "ft" }, apart so a panel can set the
// number large and the unit small.
export function formatFeet(feet: number): { value: string; unit: string } {
  return { value: wholeNumber.format(feet), unit: 'ft' }
}

const oneDecimal = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// 7 → { value: "7.0", unit: "mi" }, to a tenth of a mile like WTA's own
// lengths.
export function formatMiles(miles: number): { value: string; unit: string } {
  return { value: oneDecimal.format(miles), unit: 'mi' }
}
