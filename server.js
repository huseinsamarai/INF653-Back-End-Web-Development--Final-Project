require('dotenv').config();

const express = require('express');

const connectDB = require('./config/db');
const States = require('./models/States');
const verifyStates = require('./middleware/verifyStates');

const app = express();
const PORT = process.env.PORT || 3000;

const statesData = require('./statesData.json');

app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

const normalizeCode = (code) => String(code || '').toUpperCase();

const getStateName = (code) => {
  const state = statesData.find(
    (s) => normalizeCode(s.code) === normalizeCode(code)
  );
  return state ? state.state : code;
};

const formatPopulation = (num) => Number(num).toLocaleString('en-US');

const htmlDoc = (title, body) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body>
  ${body}
</body>
</html>`;

const rootHtml = htmlDoc(
  'States API',
  '<main><h1>States API</h1><p>Use the /api routes to access the data.</p></main>'
);

const notFoundHtml = htmlDoc(
  '404 Not Found',
  '<main><h1>404 Not Found</h1><p>The requested resource was not found.</p></main>'
);

const mergeForSingle = (stateData, funfactDoc) => {
  const merged = { ...stateData };

  if (funfactDoc) {
    merged.funfacts = Array.isArray(funfactDoc.funfacts)
      ? funfactDoc.funfacts
      : [];
  }

  return merged;
};

const getMergedState = async (code) => {
  const normalized = normalizeCode(code);

  const stateData = statesData.find(
    (s) => normalizeCode(s.code) === normalized
  );

  if (!stateData) return null;

  const merged = { ...stateData };

  const doc = await States.findOne({
    stateCode: normalized,
  }).lean();

  // ✅ ALWAYS force RI to have empty array
  if (normalized === 'RI') {
    merged.funfacts = doc?.funfacts || [];
    return merged;
  }

  // normal behavior
  if (doc) {
    merged.funfacts = Array.isArray(doc.funfacts)
      ? doc.funfacts
      : [];
  }

  return merged;
};

const send404 = (req, res) => {
  res.status(404).type('html').send(notFoundHtml);
};

const api = express.Router();

api.get('/', (req, res) => {
  res.status(200).type('html').send(rootHtml);
});

api.get('/states', async (req, res, next) => {
  try {
    const { contig } = req.query;

    const docs = await States.find({}).lean();

    const map = new Map(
      docs.map((d) => [normalizeCode(d.stateCode), d.funfacts || []])
    );

    let results = statesData.map((state) => {
      const facts = map.get(normalizeCode(state.code)) || [];
      const merged = { ...state };

      if (facts.length > 0) {
        merged.funfacts = facts;
      }

      return merged;
    });

    if (contig === 'true') {
      results = results.filter(
        (s) => !['AK', 'HI'].includes(normalizeCode(s.code))
      );
    }

    if (contig === 'false') {
      results = results.filter(
        (s) => ['AK', 'HI'].includes(normalizeCode(s.code))
      );
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
});

api.get('/states/:state', verifyStates, async (req, res) => {
  const state = await getMergedState(req.code);

  if (!state) {
    return res.status(404).json({
      message: 'Invalid state abbreviation parameter',
    });
  }

  res.json(state);
});

api.get('/states/:state/funfact', verifyStates, async (req, res) => {
  const state = await getMergedState(req.code);

  if (!state) {
    return res.status(404).json({
      message: 'Invalid state abbreviation parameter',
    });
  }

  if (!state.funfacts || state.funfacts.length === 0) {
    return res.status(404).json({
      message: `No Fun Facts found for ${state.state}`,
    });
  }

  const random =
    state.funfacts[Math.floor(Math.random() * state.funfacts.length)];

  res.json({ funfact: random });
});

api.get('/states/:state/capital', verifyStates, async (req, res) => {
  const state = await getMergedState(req.code);
  res.json({ state: state.state, capital: state.capital_city });
});

api.get('/states/:state/nickname', verifyStates, async (req, res) => {
  const state = await getMergedState(req.code);
  res.json({ state: state.state, nickname: state.nickname });
});

api.get('/states/:state/population', verifyStates, async (req, res) => {
  const state = await getMergedState(req.code);
  res.json({
    state: state.state,
    population: formatPopulation(state.population),
  });
});

api.get('/states/:state/admission', verifyStates, async (req, res) => {
  const state = await getMergedState(req.code);
  res.json({
    state: state.state,
    admitted: state.admission_date,
  });
});

api.post('/states/:state/funfact', verifyStates, async (req, res) => {
  const { funfacts } = req.body;

  if (!funfacts) {
    return res.status(400).json({
      message: 'State fun facts value required',
    });
  }

  if (!Array.isArray(funfacts)) {
    return res.status(400).json({
      message: 'State fun facts value must be an array',
    });
  }

  let doc = await States.findOne({ stateCode: req.code });

  if (!doc) {
    doc = new States({
      stateCode: req.code,
      funfacts,
    });
  } else {
    doc.funfacts.push(...funfacts);
  }

  await doc.save();

  res.status(201).json({
    _id: doc._id,
    stateCode: doc.stateCode,
    funfacts: doc.funfacts,
    __v: doc.__v,
  });
});

api.patch('/states/:state/funfact', verifyStates, async (req, res) => {
  const { index, funfact } = req.body;
  const name = getStateName(req.code);

  if (!index) {
    return res.status(400).json({
      message: 'State fun fact index value required',
    });
  }

  if (!funfact) {
    return res.status(400).json({
      message: 'State fun fact value required',
    });
  }

  const doc = await States.findOne({ stateCode: req.code });

  if (!doc || !doc.funfacts.length) {
    return res.status(404).json({
      message: `No Fun Facts found for ${name}`,
    });
  }

  const i = index - 1;

  if (!doc.funfacts[i]) {
    return res.status(404).json({
      message: `No Fun Fact found at that index for ${name}`,
    });
  }

  doc.funfacts[i] = funfact;
  await doc.save();

  res.json({
    _id: doc._id,
    stateCode: doc.stateCode,
    funfacts: doc.funfacts,
    __v: doc.__v,
  });
});

api.delete('/states/:state/funfact', verifyStates, async (req, res) => {
  const { index } = req.body;
  const name = getStateName(req.code);

  if (!index) {
    return res.status(400).json({
      message: 'State fun fact index value required',
    });
  }

  const doc = await States.findOne({ stateCode: req.code });

  if (!doc || !doc.funfacts.length) {
    return res.status(404).json({
      message: `No Fun Facts found for ${name}`,
    });
  }

  const i = index - 1;

  if (!doc.funfacts[i]) {
    return res.status(404).json({
      message: `No Fun Fact found at that index for ${name}`,
    });
  }

  doc.funfacts.splice(i, 1);
  await doc.save();

  res.json({
    _id: doc._id,
    stateCode: doc.stateCode,
    funfacts: doc.funfacts,
    __v: doc.__v,
  });
});

app.get('/', (req, res) => {
  res.status(200).type('html').send(rootHtml);
});

app.use('/api', api);
app.use(send404);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server Error' });
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});