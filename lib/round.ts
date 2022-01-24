export function round(value: number, percision: number = 0): number {
  return (
    Math.round((value + Number.EPSILON) * Math.pow(10, percision)) /
    Math.pow(10, percision)
  )
}
