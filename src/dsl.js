exports.rootMethodology = {
  version: "1.0",
  categories: [
    {
      code: "principal_adverse_impacts",
      name: "Principal Adverse Impacts",
      empty_state:
        "No Principal Adverse Impacts are required in the methodology.",
      icon: "",
    },
    {
      code: "controversies_criteria",
      name: "Controversies criteria",
      empty_state:
        "No controversial business involvements are required in the methodology.",
      icon: "",
    },
  ],
  classifications: [
    {
      code: "sustainable",
      name: "Sustainable",
      condition: "$params.engineClassifications.PASS",
    },
    {
      code: "not_sustainable",
      name: "Not Sustainable",
      condition: "$params.engineClassifications.NOT_PASS",
    },
    {
      code: "uncovered",
      name: "Uncovered",
      condition: "$params.engineClassifications.NONE",
    },
  ],
  steps: [
    {
      code: "passes_negative_screening",
      name: "Passes Negative Screening",
      categories: [
        {
          code: "principal_adverse_impacts",
          rules: [
            {
              code: "pais_excluded",
              name: "Which of these PAIs must be excluded?",
              type: "select",
              options: "$params.qualitativePAIs",
            },
            {
              dependency_rule: "pais_excluded",
              name: "Principal Adverse Impacts upon a threshold",
              code: "pais_upon_threshold",
              type: "select_threshold",
              options: "$params.quantitativePAIs",
            },
          ],
        },
      ],
    },
  ],
};
