interface Scale {
  height: number
  width: number
}

/**
 * Given a height and width, scale to match a new desired height or width
 * @param original { height: number, width: number } of the original image
 * @param desired { height?: number, width?: number } height or width desired
 */
export function rescale(original: Scale, desired: Partial<Scale>): Scale {
  if (desired.height && desired.width) {
    throw new Error("Can't rescale to both a height and width")
  } else if (desired.height) {
    const ratio = desired.height / original.height
    return {
      height: desired.height,
      width: original.width * ratio,
    }
  } else if (desired.width) {
    const ratio = desired.width / original.width
    return {
      width: desired.width,
      height: original.height * ratio,
    }
  } else {
    return original
  }
}
