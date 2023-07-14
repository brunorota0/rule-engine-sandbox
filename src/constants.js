exports.customOperatorModifiers = {
  within: ({ params }) => `within-${params.code}`,
};

exports.operatorsMapping = {
  less: "lessThanInclusive",
  more: "greaterThanInclusive",
  within: "within",
  equal: "equal",
};

exports.engineClassifications = {
  PASS: "pass",
  NOT_PASS: "not_pass",
  NONE: "none",
};
