const statesData = require('../statesData.json');

const validCodes = statesData.map((state) => state.code.toUpperCase());

function verifyStates(req, res, next) {
  const code = String(req.params.state || '').toUpperCase();

  if (!validCodes.includes(code)) {
    return res.status(404).json({ error: '404 Not Found' });
  }

  req.code = code;
  next();
}

module.exports = verifyStates;