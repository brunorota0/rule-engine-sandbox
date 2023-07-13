const Joi = require("joi");

exports.validationByType = {
  select_threshold: Joi.number().positive().precision(2).min(0).max(100),
  select: {
    validate: () => true, // no need to validate the value in this case
  },
};
