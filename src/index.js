const { Engine } = require("json-rules-engine");
const {
  updateMethodology,
  generateRulesSet,
  getRootMethodology,
  getMethodology,
  validateRule,
  getConditionsFromResult,
} = require("./methodology.service.js");
const { partition } = require("lodash");
const { assetsData } = require("./assets-data.js");
const { Promise } = require("bluebird");
const { engineClassifications } = require("./constants.js");
const fs = require("fs");
const path = require("path");
const { customOperators } = require("./custom-operators.js");

const main = async () => {
  console.time();
  // STEP 1 - Get root methodology
  const rootMethodology = getRootMethodology();

  // STEP 2 - Get methodology
  const methodology = getMethodology();

  // Declare new rules (Test purposes)

  // "operators": [
  //   "within-lowest",
  //   "within-largest",
  //   "more",
  //   "less",
  //   "between",
  //   "above",
  //   "max"
  // ]

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
    {
      step_code: "passes_negative_screening",
      category_code: "principal_adverse_impacts",
      rule_code: "pais_upon_threshold",
      value: {
        code: "total_share_non_renewable_energy_consumption",
        operator: "between",
        value: {
          from: 10,
          to: 50,
        },
      },
    },
    {
      step_code: "passes_negative_screening",
      category_code: "principal_adverse_impacts",
      rule_code: "pais_upon_threshold",
      value: {
        code: "scope_1_emissions",
        value: 60,
        operator: "less",
      },
    },
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

  const ruleToDelete = {
    step_code: "passes_negative_screening",
    category_code: "principal_adverse_impacts",
    rule_code: "pais_upon_threshold",
    code: "scope_1_emissions",
  };

  // STEP 3 - Validate new rules
  newRules.forEach((newRule) => {
    validateRule({
      newRule,
      root: rootMethodology,
    });
  });

  // STEP 4 - Update the methodology
  newRules.forEach((newRule) => {
    updateMethodology({ methodology, newRule });
  });

  // delete rules
  updateMethodology({ methodology, newRule: ruleToDelete, del: true });

  // STEP 5 - Generate set of rules from a methodology
  const rules = generateRulesSet({ methodology });

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
    const customOperatorsKeys = Object.keys(customOperators);

    let customOperator;
    customOperatorsKeys.forEach((key) => {
      if (rule.operator.includes(key)) {
        customOperator = customOperators[key];
      }
    });

    if (!customOperator) return;

    engine.addOperator(rule.operator, customOperator);
  });

  const getConditions = ({ asset, results, failureResults }) => {
    const { PASS, NOT_PASS, NONE } = engineClassifications;

    const failures = getConditionsFromResult(failureResults);
    const [skippedConditions, failureConditions] = partition(
      failures,
      (condition) => asset[condition.code] === null
    );

    return {
      [PASS]: getConditionsFromResult(results),
      [NOT_PASS]: failureConditions,
      [NONE]: skippedConditions,
    };
  };

  // Step 8 - [RUN ENGINE] For each asset separately
  const engineOutput = await Promise.map(
    assetsData, // TODO: ingest fund instruments
    async (asset) => {
      const { results, failureResults } = await engine.run({ asset });

      return {
        asset,
        conditions: getConditions({ asset, results, failureResults }),
      };
    },
    { concurrency: 10 }
  );

  // STEP 9 - Classify results
  const { PASS, NOT_PASS, NONE } = engineClassifications;

  const classificationsMapping = rootMethodology.classifications.reduce(
    (obj, value) => {
      obj[value.condition] = value.code;
      return obj;
    },
    {}
  );

  const classifications = Object.values(classificationsMapping).reduce(
    (obj, value) => {
      obj[value] = [];
      return obj;
    },
    {}
  );

  engineOutput.forEach((result) => {
    const hasSkippedConditions = result.conditions[NONE].length > 0;
    const hasFailedConditions = result.conditions[NOT_PASS].length > 0;

    const success = !hasFailedConditions && !hasSkippedConditions;

    if (success) {
      classifications[classificationsMapping[PASS]].push(result);
      return;
    }

    if (hasSkippedConditions) {
      classifications[classificationsMapping[NONE]].push(result);
    } else {
      classifications[classificationsMapping[NOT_PASS]].push(result);
    }
  });

  // STEP 10 [EXTRA] - output files
  const outputDir = path.join(__dirname, "../output");
  fs.mkdirSync(outputDir, { recursive: true });

  const dataToGenerateFiles = [
    { name: "result", object: classifications },
    { name: "rules", object: rules },
    { name: "methodology", object: methodology },
    { name: "root_methodology", object: rootMethodology },
  ];

  dataToGenerateFiles.forEach((data) => {
    const filePath = path.join(outputDir, `${data.name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data.object, null, 2));
  });

  console.timeEnd();
};

main();
