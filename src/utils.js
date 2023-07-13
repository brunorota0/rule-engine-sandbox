// bi-directional mapping
exports.getBiDirectionalMapping = (key, map) => {
  return map[key] || Object.keys(map).find((k) => map[k] === key) || null;
};
