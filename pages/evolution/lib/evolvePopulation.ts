import swirlnet, { Net } from 'swirlnet'

const genomeSettings = {
  populationSize: 150,
  survivalThreshold: 0.2,

  disjointCoefficient: 1.0,
  excessCoefficient: 1.0,
  weightDifferenceCoefficient: 0.4,
  compatibilityThreshold: 3.0,

  genomeWeightMutationRate: 0.8,
  geneUniformWeightPerturbanceRate: 0.0,
  geneRandomWeightPerturbanceRate: 0.4,
  geneRandomWeightResetRate: 0.0,

  weightPerturbanceVariance: 1.0,
  randomWeightVariance: 5.0,

  addNodeMutationRate: 0.03,
  addLinkMutationRate: 0.05,

  allowRecurrent: false,
}

export function evolvePopulation(getFitness: (net: Net) => number) {
  // arg 0: input count
  // arg 1: output count
  const population = swirlnet.makePopulation(2, 1, genomeSettings)
  const maxGenerations = 100
  const fitnessTarget = 0.999
  let bestFitness = 0

  for (
    let generationIndex = 0;
    generationIndex < maxGenerations;
    generationIndex += 1
  ) {
    const genomes = population.getGenomes()

    let bestFitnessThisGeneration = 0

    for (let genomeIndex = 0; genomeIndex < genomes.length; genomeIndex += 1) {
      const genome = genomes[genomeIndex]

      // converts from genotype to phenotype format
      const phenotype = swirlnet.genoToPheno(genome)
      // creates network object
      const net = swirlnet.makeNet(phenotype)

      const fitness = getFitness(net)

      // sets genome fitness which influences genome reproduction
      population.setFitness(net.getGenomeID(), fitness)

      if (fitness >= fitnessTarget) {
        console.log()
        console.log(
          'winner found in ' +
            (generationIndex + 1) +
            ' generations with fitness: ' +
            fitness,
        )
        console.log()
        console.log('winning network:')
        console.log()
        console.log(JSON.parse(phenotype))
        console.log()
        console.log(phenotype)
        console.log()

        return
      }

      bestFitnessThisGeneration =
        bestFitnessThisGeneration === null ||
        fitness > bestFitnessThisGeneration
          ? fitness
          : bestFitnessThisGeneration
    }

    console.log(
      'generation: ' +
        generationIndex +
        '  best fitness: ' +
        bestFitnessThisGeneration,
    )

    bestFitness =
      bestFitness > bestFitnessThisGeneration
        ? bestFitness
        : bestFitnessThisGeneration

    population.reproduce()
  }

  console.log()
  console.log(
    'no winner found in ' +
      maxGenerations +
      ' generations. best fitness: ' +
      bestFitness,
  )
  console.log()
}
