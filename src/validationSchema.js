const Joi = require("joi");
const { operatorsMapping } = require("./constants");

exports.validationByType = {
  select_threshold: ({ operator }) => {
    if (operator === operatorsMapping.between) {
      return Joi.object({
        from: Joi.number().positive().required(),
        to: Joi.number().positive().required(),
      });
    }

    return Joi.number().positive().precision(2).min(0).max(100);
  },
  select: () => ({
    validate: () => true, // no need to validate the value in this case
  }),
};
