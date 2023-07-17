exports.customOperatorModifiers = {
  within: ({ params }) => `within-${params.code}`,
};

exports.customOperators = {
  within: (value, threshold) => {
    const prop = rule.operator.replace("within-", "");

    // TODO: use brenchamark assets
    return true;

    // const sortedAssetsByProp = sortBy(
    //   index / industry / fund,
    //   (a) => a[prop]
    // ); // TODO: Nice to have: store in redis

    const percentileIndex =
      Math.floor(sortedAssetsByProp.length * (threshold / 100)) - 1;

    const valueWithinThrehold = (val, arr) => val <= arr[percentileIndex][prop];

    return valueWithinThrehold(value, sortedAssetsByProp);
  },
  between: (value, bounds) => {
    const { from, to } = bounds;
    return value >= from && value <= to;
  },
  above: (value, max) => {
    return value <= max;
  },
  max: (value, max) => {
    return value <= max;
  },
};
