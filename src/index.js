const { Engine } = require("json-rules-engine");
const {
  updateMethodology,
  generateRulesSet,
  getRootMethodology,
  getMethodology,
  validateRule,
  getConditionsFromResult,
} = require("./methodology.service.js");
const { pick } = require("lodash");
const { assetsData } = require("./assets-data.js");
const { Promise } = require("bluebird");

const main = async () => {
  console.time();
  // STEP 1 - Get root methodology
  const rootMethodology = getRootMethodology();

  // STEP 2 - Create methodology
  const methodology = getMethodology();

  // Declare new rules (Test purposes)
  const newRules = [
    {
      step_code: "passes_negative_screening",
      category_code: "principal_adverse_impacts",
      rule_code: "pais_excluded",
      value: {
        code: "activities_affecting_biodiversity",
        operator: "equal",
        value: false,
      },
    },
    // {
    //   step_code: "passes_negative_screening",
    //   category_code: "principal_adverse_impacts",
    //   rule_code: "pais_upon_threshold",
    //   value: {
    //     code: "scope_1_emissions",
    //     value: 60,
    //     operator: "less",
    //   },
    // },
    // {
    //   step_code: "passes_negative_screening",
    //   category_code: "principal_adverse_impacts",
    //   rule_code: "pais_upon_threshold",
    //   value: {
    //     code: "scope_2_emissions",
    //     value: 30,
    //     operator: "less",
    //   },
    // },
    // {
    //   step_code: "passes_negative_screening",
    //   category_code: "principal_adverse_impacts",
    //   rule_code: "pais_upon_threshold",
    //   value: {
    //     code: "scope_3_emissions",
    //     value: 25,
    //     operator: "less",
    //   },
    // },
    // {
    //   step_code: "passes_negative_screening",
    //   category_code: "principal_adverse_impacts",
    //   rule_code: "pais_upon_threshold",
    //   value: {
    //     code: "scope_3_emissions",
    //     value: 25,
    //     operator: "within",
    //   },
    // },
  ];

  // STEP 3 - Validate new rules
  newRules.forEach((newRule) => {
    validateRule({
      newRule,
      root: rootMethodology,
    });
  });

  // STEP 4 - Update the methodology
  newRules.forEach((newRule) => {
    updateMethodology(methodology, newRule);
  });

  // STEP 5 - Generate set of rules from a methodology
  const rules = generateRulesSet({ methodology });
  console.log(JSON.stringify(rules));
  // STEP 6 - Setup the rule engine
  const engine = new Engine();

  rules.forEach((rule) => {
    engine.addRule({
      conditions: {
        all: [rule],
      },
      event: {
        // define the event to fire when the conditions evaluate truthy
        type: "sustainable",
      },
    });
  });

  // STEP 7 - Create custom operators
  rules.forEach((rule) => {
    if (rule.operator.includes("within")) {
      engine.addOperator(rule.operator, (assetValue, threshold) => {
        const prop = rule.operator.replace("within-", "");

        // TODO: use brenchamark assets
        return true;

        // const sortedAssetsByProp = sortBy(
        //   index / industry / fund,
        //   (a) => a[prop]
        // );

        const percentileIndex =
          Math.floor(sortedAssetsByProp.length * (threshold / 100)) - 1;

        const valueWithinThrehold = (val, arr) =>
          val <= arr[percentileIndex][prop];

        return valueWithinThrehold(assetValue, sortedAssetsByProp);
      });
    }
  });

  // Step 8 - [RUN ENGINE] For each asset separately
  const engineOutput = await Promise.map(
    assetsData,
    async (asset) => {
      const { results, failureResults } = await engine.run({ asset });
      const result = failureResults.length === 0;

      return {
        asset,
        result,
        passConditions: getConditionsFromResult(results),
        notPassConditions: getConditionsFromResult(failureResults),
      };
    },
    { concurrency: 10 }
  );

  const sustainableAssets = engineOutput
    .filter((assetOutput) => assetOutput.result)
    .map((o) => ({
      asset: pick(o.asset, ["id", "name"]),
      passConditions: o.passConditions,
      notPassConditions: o.notPassConditions,
    }));

  const nonSustainableAssets = engineOutput
    .filter((assetOutput) => !assetOutput.result)
    .map((o) => ({
      asset: pick(o.asset, ["id", "name"]),
      passConditions: o.passConditions,
      notPassConditions: o.notPassConditions,
    }));

  console.log(JSON.stringify(sustainableAssets));
  console.log(JSON.stringify(nonSustainableAssets));

  console.timeEnd();
};

main();
