declare module 'swirlnet' {
  export type Population = {
    getGenomes: () => Genome[]
    setFitness: (genomeID: number, fitness: number) => void
    reproduce: () => void
  }
  export type Genome = any
  export type Phenotype = any
  export type Net = {
    getGenomeID: () => number
    flush: () => void
    setInputs: (inputs: number[]) => void
    step: (iterations?: number) => void
    getOutputs: () => number[]
  }

  const makePopulation: (
    inputs: number,
    outputs: number,
    settings?: any,
  ) => Population
  const genoToPheno: (genotype: Genome) => Phenotype
  const makeNet: (phenotype: Phenotype) => Net

  export default { makePopulation, genoToPheno, makeNet }
}
