const Joi = require("joi");
const { operatorsMapping } = require("./constants");

const { above, max, between } = operatorsMapping;

exports.validationByType = {
  select_threshold: ({ operator }) => {
    const validationByOperator = this.validationByOperators[operator];
    if (validationByOperator) return validationByOperator;

    return Joi.number().required().positive().precision(2).min(0).max(100);
  },
  select: () => ({
    validate: () => true, // no need to validate the value in this case
  }),
};

exports.validationByOperators = {
  [above]: Joi.number().positive().optional().min(0).max(100),
  [max]: Joi.number().positive().required().min(0).max(100),
  [between]: Joi.object({
    from: Joi.number().positive().required(),
    to: Joi.number().positive().required(),
  }),
};
