/** Computes cosine similarity for two equal-length vectors. */
export const cosineSimilarity = (firstVector: number[], secondVector: number[]): number => {
  if (firstVector.length !== secondVector.length || firstVector.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let firstMagnitude = 0;
  let secondMagnitude = 0;

  for (let index = 0; index < firstVector.length; index += 1) {
    const firstValue = firstVector[index] ?? 0;
    const secondValue = secondVector[index] ?? 0;
    dotProduct += firstValue * secondValue;
    firstMagnitude += firstValue * firstValue;
    secondMagnitude += secondValue * secondValue;
  }

  if (firstMagnitude === 0 || secondMagnitude === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude));
};
