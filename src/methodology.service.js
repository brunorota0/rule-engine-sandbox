const Joi = require("joi");
const { rootMethodology } = require("./dsl");
const { customOperatorModifiers, operatorsMapping } = require("./constants");
const { validationByType } = require("./validationSchema");
const { getBiDirectionalMapping } = require("./utils");

exports.validateRule = ({ newRule, root }) => {
  if (!newRule || !newRule.value) throw new Error("The new rule is empty");

  // get rule from the root methodology
  const rule = getRuleFromRootMethodology({ newRule, root });
  if (!rule) throw new Error("The specified rule doesn't exists");

  // validation chain
  validateOption({ rule, newRule });
  validateOperator({ rule, newRule });
  validateValue({ rule, newRule });
};

const getRuleFromRootMethodology = ({ newRule, root }) => {
  let rule;
  root.steps.forEach((step) => {
    if (step.code !== newRule.step_code) return;

    step.rules.forEach((r) => {
      if (
        r.category_code === newRule.category_code &&
        r.code === newRule.rule_code
      ) {
        rule = r;
      }
    });
  });

  return rule;
};

const validateOption = ({ rule, newRule }) => {
  const optionsSchema = Joi.string().valid(...rule.options.map((o) => o.code));
  const optionValidation = optionsSchema.validate(newRule.value.code);

  if (optionValidation.error) throw new Error("This option is not available");
};

const validateOperator = ({ rule, newRule }) => {
  const operator = getBiDirectionalMapping(
    newRule.value.operator,
    operatorsMapping
  );
  if (!operator) throw new Error("The operator is not a valid operator");

  const option = rule.options.find((o) => o.code);
  const operatorSchema = Joi.string().valid(...option.operators);
  const operatorValidation = operatorSchema.validate(newRule.value.operator);
  if (operatorValidation.error)
    throw new Error("The operator is not a valid operator for this option");
};

const validateValue = ({ rule, newRule }) => {
  const { type } = rule;
  const valueSchema = validationByType[type];
  if (!valueSchema) throw new Error("The type of the input is not valid");

  const valueValidation = valueSchema.validate(newRule.value.value);
  if (valueValidation.error)
    throw new Error("The value is not valid for this option");
};

exports.updateMethodology = (obj, newRule) => {
  let updateResult = false;
  obj.steps.forEach((step) => {
    if (step.code !== newRule.step_code) return;

    // new value with the operator mapped
    const operator = newRule.value.operator;
    const value = {
      ...newRule.value,
      operator: getBiDirectionalMapping(operator, operatorsMapping),
    };

    step.rules.forEach((rule) => {
      if (
        rule.category_code === newRule.category_code &&
        rule.code === newRule.rule_code
      ) {
        // add the new rule as the only one
        if (!rule.value) {
          updateResult = true;
          rule.value = [value];
          return;
        }

        if (rule.value.some((v) => v.code === value.code)) {
          // replace the existent rule
          rule.value = rule.value.map((v) => {
            if (v.code === value.code) {
              updateResult = true;
              return value;
            }
            return v;
          });
        } else {
          // push the value in the rule
          rule.value.push(value);
          updateResult = true;
        }
      }
    });
  });

  return updateResult;
};

exports.generateRulesSet = ({ methodology }) => {
  return methodology.steps
    .map((step) =>
      step.rules.map(
        (rule) =>
          rule.value &&
          rule.value.length > 0 &&
          rule.value.map((value) => {
            let operator = value.operator;

            if (Object.keys(customOperatorModifiers).includes(operator)) {
              operator = customOperatorModifiers[operator]({
                params: { code: value.code },
              });
            }

            return {
              fact: "asset",
              operator,
              value: value.value,
              path: `$.${value.code}`,
              code: value.code,
              originalOperator: value.operator,
            };
          })
      )
    )
    .flat(2)
    .filter((r) => r);
};

exports.getRootMethodology = () => {
  // TODO: generate this params from the KPIs in the db and a constants file that specify the operators
  const params = {
    qualitativePAIs: [
      {
        name: "Activities negatively affecting biodiversity-sensitive areas",
        code: "activities_affecting_biodiversity",
        operators: ["equal"],
        value: false, // excluded
      },
    ],
    quantitativePAIs: [
      {
        name: "(GHG) Scope 1 emissions",
        code: "scope_1_emissions",
        operators: ["within", "less"],
      },
      {
        name: "(GHG) Scope 2 emissions",
        code: "scope_2_emissions",
        operators: ["within", "less"],
      },
      {
        name: "(GHG) Scope 3 emissions",
        code: "scope_3_emissions",
        operators: ["within", "less"],
      },
      {
        name: "Non-renewable energy consumption",
        code: "total_share_non_renewable_energy_consumption",
        operators: ["within", "more", "between"],
      },
    ],
  };

  this.populateParams(rootMethodology, params, "$params.");

  return rootMethodology;
};

exports.populateParams = (jsonObj, params, paramsPrefix) => {
  for (let key in jsonObj) {
    if (typeof jsonObj[key] === "object") {
      this.populateParams(jsonObj[key], params, paramsPrefix);
    } else if (
      typeof jsonObj[key] === "string" &&
      jsonObj[key].startsWith(paramsPrefix)
    ) {
      let paramName = jsonObj[key].split(".")[1];
      if (params.hasOwnProperty(paramName)) {
        jsonObj[key] = params[paramName];
      }
    }
  }
};

exports.getMethodology = () => {
  // TODO: get the methodology reference from the DB
  // TODO: if it exists, get the JSON from the S3
  // TODO: check if the root methodology changed, and then update the methodology
  let methodology;
  if (methodology) return methodology;

  // generate new methodology based on the root methodology
  methodology = {
    metadata: {
      version: rootMethodology.version,
    },
    steps: rootMethodology.steps.map((step) => ({
      code: step.code,
      rules: step.rules.map((rule) => ({
        code: rule.code,
        category_code: rule.category_code,
      })),
    })),
  };

  return methodology;
};

exports.getConditionsFromResult = (result) => {
  return result
    .map((source) =>
      source.conditions.all.map((condition) => ({
        code: condition.code,
        operator: getBiDirectionalMapping(
          condition.originalOperator,
          operatorsMapping
        ),
        value: condition.value,
      }))
    )
    .flat(2);
};
